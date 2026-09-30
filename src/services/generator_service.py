import io
import os

import cv2
import numpy as np
import torch
from diffusers import AutoPipelineForImage2Image, DDIMScheduler
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps

# Restore the original Stable Diffusion 1.5 generation base.
# Face detection is an add-on: normal images follow the original img2img route,
# while human images use a separate SD1.5 pipeline with the full-face IP-Adapter.
MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"
MODEL_DIR = "./models/sd15"
IP_ADAPTER_ID = "h94/IP-Adapter"
IP_ADAPTER_SUBFOLDER = "models"
IP_ADAPTER_WEIGHT = "ip-adapter-full-face_sd15.bin"

MAX_IMAGE_SIZE = 768
DEFAULT_STEPS = 30
FACE_ADAPTER_SCALE = 0.50

FACE_NEGATIVE_PROMPT = (
    "deformed face, distorted face, asymmetrical eyes, crossed eyes, malformed eyes, "
    "bad anatomy, deformed body, malformed hands, extra fingers, missing fingers, "
    "extra limbs, duplicate person, mutated, disfigured, blurry face, low quality"
)


def _place_pipeline(pipe):
    if torch.cuda.is_available():
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cpu")
    return pipe


def _load_base_pipeline():
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    pipe = AutoPipelineForImage2Image.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype,
        cache_dir=MODEL_DIR,
        use_safetensors=True,
        safety_checker=None,
        requires_safety_checker=False,
    )
    print("[AI Artist] Original SD1.5 img2img pipeline loaded.")
    return _place_pipeline(pipe)


def _load_face_pipeline():
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    try:
        pipe = AutoPipelineForImage2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            cache_dir=MODEL_DIR,
            use_safetensors=True,
            safety_checker=None,
            requires_safety_checker=False,
        )
        # Hugging Face recommends DDIM/Euler for the SD1.5 face adapter.
        pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
        pipe.load_ip_adapter(
            IP_ADAPTER_ID,
            subfolder=IP_ADAPTER_SUBFOLDER,
            weight_name=IP_ADAPTER_WEIGHT,
            cache_dir=MODEL_DIR,
        )
        pipe.set_ip_adapter_scale(FACE_ADAPTER_SCALE)
        print("[AI Artist] SD1.5 + IP-Adapter Full Face pipeline loaded.")
        return _place_pipeline(pipe)
    except Exception as exc:
        print(f"[AI Artist] Face add-on unavailable; original SD1.5 remains usable: {exc}")
        return None


base_pipeline = _load_base_pipeline()
face_pipeline = _load_face_pipeline()


def _prepare_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size

    scale = min(MAX_IMAGE_SIZE / max(width, height), 1.0)
    width = max(64, int(width * scale))
    height = max(64, int(height * scale))
    width -= width % 8
    height -= height % 8

    return image.resize((width, height), Image.Resampling.LANCZOS)


def _extract_face(image: Image.Image):
    rgb = np.array(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    detector = cv2.CascadeClassifier(
        os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    )
    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80),
    )

    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda face: face[2] * face[3])
    pad_x = int(w * 0.45)
    pad_top = int(h * 0.55)
    pad_bottom = int(h * 0.35)

    return ImageOps.fit(
        image.crop(
            (
                max(0, x - pad_x),
                max(0, y - pad_top),
                min(image.width, x + w + pad_x),
                min(image.height, y + h + pad_bottom),
            )
        ),
        (512, 512),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.45),
    )


def _build_prompt(style_prompt: str, has_face: bool) -> str:
    # Non-human images receive the exact original frontend prompt.
    if not has_face:
        return style_prompt.strip()

    return (
        f"{style_prompt.strip()} "
        "Keep the person recognizable, preserve facial identity, expression, "
        "hairstyle and natural human anatomy."
    )


async def generate_image(
    image: UploadFile,
    prompt: str,
    strength: float = 0.5,
    guidance_scale: float = 7.5,
):
    try:
        image_data = await image.read()
        init_image = _prepare_image(Image.open(io.BytesIO(image_data)))
        face_image = _extract_face(init_image)

        # Keep the original controls usable; only protect against invalid input.
        strength = max(0.0, min(float(strength), 1.0))
        guidance_scale = max(1.0, min(float(guidance_scale), 15.0))

        use_face_pipeline = face_image is not None and face_pipeline is not None
        final_prompt = _build_prompt(prompt, face_image is not None)

        generation_args = {
            "prompt": final_prompt,
            "image": init_image,
            "strength": strength,
            "guidance_scale": guidance_scale,
            "num_inference_steps": DEFAULT_STEPS,
        }

        if use_face_pipeline:
            active_pipeline = face_pipeline
            generation_args["ip_adapter_image"] = face_image
            generation_args["negative_prompt"] = FACE_NEGATIVE_PROMPT
            print("[AI Artist] Face detected: SD1.5 + face add-on.")
        else:
            active_pipeline = base_pipeline
            print("[AI Artist] Original SD1.5 img2img route.")

        with torch.inference_mode():
            generated_image = active_pipeline(**generation_args).images[0]

        img_bytes = io.BytesIO()
        generated_image.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        return StreamingResponse(img_bytes, media_type="image/png")

    except Exception as exc:
        print(f"[AI Artist] Generation error: {exc}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {exc}")

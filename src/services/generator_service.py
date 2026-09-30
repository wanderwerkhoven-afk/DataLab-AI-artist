import io
import os

import cv2
import numpy as np
import torch
from diffusers import AutoPipelineForImage2Image, DPMSolverMultistepScheduler
from fastapi import UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps

# ---------------------------------------------------------------------------
# Local AI Artist pipeline
# ---------------------------------------------------------------------------
# SDXL replaces SD 1.5 for better anatomy, faces and overall image quality.
# Everything is still downloaded/cached and executed locally.
MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
MODEL_DIR = "./models/sdxl"
IP_ADAPTER_ID = "h94/IP-Adapter"
IP_ADAPTER_SUBFOLDER = "sdxl_models"
IP_ADAPTER_WEIGHT = "ip-adapter-plus-face_sdxl_vit-h.safetensors"

MAX_IMAGE_SIZE = 1024
DEFAULT_STEPS = 30
FACE_ADAPTER_SCALE = 0.65

NEGATIVE_PROMPT = (
    "deformed face, distorted face, asymmetrical eyes, crossed eyes, malformed eyes, "
    "bad anatomy, deformed body, malformed hands, extra fingers, missing fingers, "
    "extra limbs, duplicate person, mutated, disfigured, blurry face, low quality, "
    "low resolution, jpeg artifacts"
)


def _load_pipeline():
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    pipe = AutoPipelineForImage2Image.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype,
        cache_dir=MODEL_DIR,
        use_safetensors=True,
    )

    # A DPM++ scheduler is generally more stable for the relatively small number
    # of inference steps used by this interactive demo.
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        algorithm_type="dpmsolver++",
        use_karras_sigmas=True,
    )

    # IP-Adapter Plus Face gives SDXL a second visual reference specifically for
    # facial identity. If it cannot be loaded, the demo still works with SDXL.
    try:
        pipe.load_ip_adapter(
            IP_ADAPTER_ID,
            subfolder=IP_ADAPTER_SUBFOLDER,
            weight_name=IP_ADAPTER_WEIGHT,
            cache_dir=MODEL_DIR,
        )
        pipe.set_ip_adapter_scale(FACE_ADAPTER_SCALE)
        pipe._face_adapter_available = True
        print("[AI Artist] SDXL + IP-Adapter Face loaded.")
    except Exception as exc:
        pipe._face_adapter_available = False
        print(f"[AI Artist] IP-Adapter unavailable; using SDXL only: {exc}")

    if torch.cuda.is_available():
        # Keeps VRAM use manageable on a local demo machine.
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cpu")

    return pipe


pipeline = _load_pipeline()


def _prepare_image(image: Image.Image) -> Image.Image:
    """Correct orientation and resize to an SDXL-friendly multiple of 8."""
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size

    scale = min(MAX_IMAGE_SIZE / max(width, height), 1.0)
    width = max(64, int(width * scale))
    height = max(64, int(height * scale))

    width -= width % 8
    height -= height % 8

    return image.resize((width, height), Image.Resampling.LANCZOS)


def _extract_face(image: Image.Image):
    """Return the largest detected face with some context, or None."""
    rgb = np.array(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    cascade_path = os.path.join(
        cv2.data.haarcascades, "haarcascade_frontalface_default.xml"
    )
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80),
    )

    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda face: face[2] * face[3])

    # Include hair, ears and part of the shoulders; this gives the adapter more
    # identity information than an extremely tight face crop.
    pad_x = int(w * 0.45)
    pad_top = int(h * 0.55)
    pad_bottom = int(h * 0.35)

    left = max(0, x - pad_x)
    top = max(0, y - pad_top)
    right = min(image.width, x + w + pad_x)
    bottom = min(image.height, y + h + pad_bottom)

    face = image.crop((left, top, right, bottom))
    return ImageOps.fit(
        face,
        (512, 512),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.45),
    )


def _build_prompt(style_prompt: str, has_face: bool) -> str:
    preservation = (
        "Preserve the original composition, camera angle, subject positions and proportions. "
    )
    if has_face:
        preservation += (
            "Keep the person recognizable. Preserve facial identity, facial proportions, "
            "expression, hairstyle, body pose and natural human anatomy. "
        )

    return f"{preservation}{style_prompt.strip()}"


async def generate_image(
    image: UploadFile,
    prompt: str,
    strength: float = 0.5,
    guidance_scale: float = 7.5,
):
    """Generate a local SDXL img2img result, with face conditioning when possible."""
    try:
        image_data = await image.read()
        init_image = _prepare_image(Image.open(io.BytesIO(image_data)))
        face_image = _extract_face(init_image)

        # Keep interactive controls within sensible SDXL ranges.
        strength = max(0.15, min(float(strength), 0.80))
        guidance_scale = max(1.0, min(float(guidance_scale), 12.0))

        has_face = face_image is not None
        final_prompt = _build_prompt(prompt, has_face)

        generation_args = {
            "prompt": final_prompt,
            "negative_prompt": NEGATIVE_PROMPT,
            "image": init_image,
            "strength": strength,
            "guidance_scale": guidance_scale,
            "num_inference_steps": DEFAULT_STEPS,
        }

        if has_face and getattr(pipeline, "_face_adapter_available", False):
            generation_args["ip_adapter_image"] = face_image
            print("[AI Artist] Face detected: using SDXL + IP-Adapter Face.")
        else:
            print("[AI Artist] No usable face adapter input: using SDXL img2img.")

        with torch.inference_mode():
            generated_image = pipeline(**generation_args).images[0]

        img_bytes = io.BytesIO()
        generated_image.save(img_bytes, format="PNG")
        img_bytes.seek(0)

        return StreamingResponse(img_bytes, media_type="image/png")

    except Exception as exc:
        print(f"[AI Artist] Generation error: {exc}")
        return {"error": str(exc)}

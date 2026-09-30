import io
import os

import cv2
import numpy as np
import torch
from diffusers import AutoPipelineForImage2Image, DDIMScheduler
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps

MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"
MODEL_DIR = "./models/sd15"

# Face pipeline: InsightFace identity embedding + CLIP face structure.
FACEID_REPO = "h94/IP-Adapter-FaceID"
FACEID_WEIGHT = "ip-adapter-faceid-plusv2_sd15.bin"
FACEID_CLIP_MODEL = "laion/CLIP-ViT-H-14-laion2B-s32B-b79K"
FACEID_WEIGHT_PATH = os.path.join(MODEL_DIR, FACEID_WEIGHT)

MAX_IMAGE_SIZE = 768
DEFAULT_STEPS = 30
FACEID_SCALE = 0.75
FACE_STRUCTURE_SCALE = 0.80

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


def _load_face_system():
    """Load FaceID Plus V2 separately so the original SD1.5 route stays untouched."""
    try:
        from insightface.app import FaceAnalysis
        from ip_adapter.ip_adapter_faceid import IPAdapterFaceIDPlus

        if not torch.cuda.is_available():
            print("[AI Artist] FaceID Plus V2 requires CUDA in this kiosk setup; using SD1.5 fallback.")
            return None, None

        if not os.path.exists(FACEID_WEIGHT_PATH):
            print(
                f"[AI Artist] FaceID checkpoint missing at {FACEID_WEIGHT_PATH}. "
                "Run python download.py first."
            )
            return None, None

        dtype = torch.float16
        pipe = AutoPipelineForImage2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            cache_dir=MODEL_DIR,
            use_safetensors=True,
            safety_checker=None,
            requires_safety_checker=False,
        )
        pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)

        face_adapter = IPAdapterFaceIDPlus(
            pipe,
            FACEID_CLIP_MODEL,
            FACEID_WEIGHT_PATH,
            "cuda",
            torch_dtype=dtype,
        )

        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        face_analyser = FaceAnalysis(name="buffalo_l", providers=providers)
        face_analyser.prepare(ctx_id=0, det_size=(640, 640))

        print("[AI Artist] SD1.5 + IP-Adapter FaceID Plus V2 loaded.")
        return face_adapter, face_analyser
    except Exception as exc:
        print(f"[AI Artist] FaceID Plus V2 unavailable; original SD1.5 remains usable: {exc}")
        return None, None


base_pipeline = _load_base_pipeline()
face_adapter, face_analyser = _load_face_system()


def _prepare_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size

    scale = min(MAX_IMAGE_SIZE / max(width, height), 1.0)
    width = max(64, int(width * scale))
    height = max(64, int(height * scale))
    width -= width % 8
    height -= height % 8

    return image.resize((width, height), Image.Resampling.LANCZOS)


def _extract_faceid(image: Image.Image):
    """Return the largest detected face's identity embedding and aligned 224px face."""
    if face_analyser is None:
        return None

    from insightface.utils import face_align

    rgb = np.array(image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    faces = face_analyser.get(bgr)

    if not faces:
        return None

    face = max(
        faces,
        key=lambda item: (item.bbox[2] - item.bbox[0]) * (item.bbox[3] - item.bbox[1]),
    )
    faceid_embeds = torch.from_numpy(face.normed_embedding).unsqueeze(0)
    aligned_face = face_align.norm_crop(bgr, landmark=face.kps, image_size=224)
    return faceid_embeds, aligned_face


def _build_prompt(style_prompt: str, has_face: bool) -> str:
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
        face_data = _extract_faceid(init_image)

        strength = max(0.0, min(float(strength), 1.0))
        guidance_scale = max(1.0, min(float(guidance_scale), 15.0))

        use_faceid = face_data is not None and face_adapter is not None
        final_prompt = _build_prompt(prompt, use_faceid)

        with torch.inference_mode():
            if use_faceid:
                faceid_embeds, aligned_face = face_data
                print("[AI Artist] Face detected: SD1.5 + FaceID Plus V2 route.")
                generated_image = face_adapter.generate(
                    face_image=aligned_face,
                    faceid_embeds=faceid_embeds,
                    prompt=final_prompt,
                    negative_prompt=FACE_NEGATIVE_PROMPT,
                    scale=FACEID_SCALE,
                    shortcut=True,
                    s_scale=FACE_STRUCTURE_SCALE,
                    num_samples=1,
                    guidance_scale=guidance_scale,
                    num_inference_steps=DEFAULT_STEPS,
                    image=init_image,
                    strength=strength,
                )[0]
            else:
                print("[AI Artist] Original SD1.5 img2img route.")
                generated_image = base_pipeline(
                    prompt=final_prompt,
                    image=init_image,
                    strength=strength,
                    guidance_scale=guidance_scale,
                    num_inference_steps=DEFAULT_STEPS,
                ).images[0]

        img_bytes = io.BytesIO()
        generated_image.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        return StreamingResponse(img_bytes, media_type="image/png")

    except Exception as exc:
        print(f"[AI Artist] Generation error: {exc}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {exc}")

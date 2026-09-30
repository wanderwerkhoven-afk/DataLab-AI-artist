import os

from huggingface_hub import hf_hub_download, snapshot_download

SD15_CACHE = "./models/sd15"

SD15_PATTERNS = [
    "model_index.json",
    "scheduler/*",
    "tokenizer/*",
    "text_encoder/config.json",
    "text_encoder/model.safetensors",
    "text_encoder/model.fp16.safetensors",
    "unet/config.json",
    "unet/diffusion_pytorch_model.safetensors",
    "unet/diffusion_pytorch_model.fp16.safetensors",
    "vae/config.json",
    "vae/diffusion_pytorch_model.safetensors",
    "vae/diffusion_pytorch_model.fp16.safetensors",
    "feature_extractor/*",
]

CLIP_PATTERNS = [
    "config.json",
    "preprocessor_config.json",
    "model.safetensors",
    "pytorch_model.bin",
]

print("Downloading Stable Diffusion 1.5 Diffusers files...")
snapshot_download(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    cache_dir=SD15_CACHE,
    allow_patterns=SD15_PATTERNS,
)

print("Downloading IP-Adapter FaceID Plus V2 for SD1.5...")
faceid_cached = hf_hub_download(
    "h94/IP-Adapter-FaceID",
    filename="ip-adapter-faceid-plusv2_sd15.bin",
    cache_dir=SD15_CACHE,
)
faceid_target = os.path.join(SD15_CACHE, "ip-adapter-faceid-plusv2_sd15.bin")
if os.path.abspath(faceid_cached) != os.path.abspath(faceid_target):
    import shutil
    shutil.copy2(faceid_cached, faceid_target)

print("Downloading CLIP ViT-H encoder used by FaceID Plus V2...")
snapshot_download(
    "laion/CLIP-ViT-H-14-laion2B-s32B-b79K",
    cache_dir=SD15_CACHE,
    allow_patterns=CLIP_PATTERNS,
)

print("Done. SD1.5 + IP-Adapter FaceID Plus V2 assets are available locally.")

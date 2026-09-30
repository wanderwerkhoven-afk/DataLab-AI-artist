from huggingface_hub import snapshot_download

SD15_CACHE = "./models/sd15"

# Stable Diffusion 1.5 is the original DataLab AI Artist generation base.
# Download only PyTorch/Diffusers files used by the application.
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
    "safety_checker/config.json",
    "safety_checker/model.safetensors",
    "safety_checker/model.fp16.safetensors",
]

IP_ADAPTER_PATTERNS = [
    "models/ip-adapter-full-face_sd15.bin",
    "models/image_encoder/*",
]

print("Downloading Stable Diffusion 1.5 Diffusers files...")
snapshot_download(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    cache_dir=SD15_CACHE,
    allow_patterns=SD15_PATTERNS,
)

print("Downloading SD1.5 IP-Adapter Full Face add-on...")
snapshot_download(
    "h94/IP-Adapter",
    cache_dir=SD15_CACHE,
    allow_patterns=IP_ADAPTER_PATTERNS,
)

print("Done. Original SD1.5 base + face add-on are available locally.")

from huggingface_hub import snapshot_download

MODEL_CACHE = "./models/sdxl"

# Download only the files used by the PyTorch/Diffusers pipeline.
# This intentionally excludes Flax, ONNX, OpenVINO and full single-file
# checkpoints, which are large and not used by DataLab AI Artist.
SDXL_PATTERNS = [
    "model_index.json",
    "scheduler/*",
    "tokenizer/*",
    "tokenizer_2/*",
    "text_encoder/config.json",
    "text_encoder/model.safetensors",
    "text_encoder/model.fp16.safetensors",
    "text_encoder_2/config.json",
    "text_encoder_2/model.safetensors",
    "text_encoder_2/model.fp16.safetensors",
    "unet/config.json",
    "unet/diffusion_pytorch_model.safetensors",
    "unet/diffusion_pytorch_model.fp16.safetensors",
    "vae/config.json",
    "vae/diffusion_pytorch_model.safetensors",
    "vae/diffusion_pytorch_model.fp16.safetensors",
]

IP_ADAPTER_PATTERNS = [
    "sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors",
    "models/image_encoder/*",
    "sdxl_models/image_encoder/*",
]

print("Downloading only the SDXL files required by Diffusers/PyTorch...")
snapshot_download(
    "stabilityai/stable-diffusion-xl-base-1.0",
    cache_dir=MODEL_CACHE,
    allow_patterns=SDXL_PATTERNS,
)

print("Downloading IP-Adapter Face files...")
snapshot_download(
    "h94/IP-Adapter",
    cache_dir=MODEL_CACHE,
    allow_patterns=IP_ADAPTER_PATTERNS,
)

print("Done. SDXL and IP-Adapter Face are available in the local cache.")

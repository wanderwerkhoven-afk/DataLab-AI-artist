from huggingface_hub import snapshot_download

# Optional pre-download helper for the fully local DataLab demo.
# The generator will also download these automatically on first use.
print("Downloading SDXL...")
snapshot_download(
    "stabilityai/stable-diffusion-xl-base-1.0",
    cache_dir="./models/sdxl",
)

print("Downloading IP-Adapter...")
snapshot_download(
    "h94/IP-Adapter",
    cache_dir="./models/sdxl",
    allow_patterns=[
        "sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors",
        "models/image_encoder/*",
        "sdxl_models/image_encoder/*",
    ],
)

print("AI Artist models are available in the local cache.")

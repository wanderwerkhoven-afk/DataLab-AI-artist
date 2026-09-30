from huggingface_hub import snapshot_download

# Download the model and specify the local directory
model_dir = snapshot_download("stable-diffusion-v1-5/stable-diffusion-v1-5")

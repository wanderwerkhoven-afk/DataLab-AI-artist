import torch
from diffusers import AutoPipelineForImage2Image
from PIL import Image
import io
from fastapi import UploadFile
from fastapi.responses import StreamingResponse

model_dir = "./models/stable-diffusion-v1-5"

pipeline = AutoPipelineForImage2Image.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16,
    cache_dir=model_dir,  
    use_safetensors=True
)
pipeline.enable_model_cpu_offload()

async def generate_image(image: UploadFile, prompt: str, strength: float = 0.5, guidance_scale: float = 13):
    """
    Handle the image generation from the uploaded image and text prompt, and return the generated image as a response.
    
    Args:
        image (UploadFile): The uploaded image file.
        prompt (str): The text prompt to guide the image generation.
        strength (float): The strength of the initial image's impact on the output. Range is 0-1, default 0.5.
        guidance_scale (float): Controls how much the model follows the prompt. Range is 1-15, default 13.
    
    Returns:
        StreamingResponse: The generated image in PNG format.
    """
    try:
        image_data = await image.read()
        init_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Generate the image 
        generated_image = pipeline(prompt, image=init_image, strength=strength, guidance_scale=guidance_scale).images[0]

        img_bytes = io.BytesIO()
        generated_image.save(img_bytes, format="PNG")
        img_bytes.seek(0)

        return StreamingResponse(img_bytes, media_type="image/png")

    except Exception as e:
        return {"error": str(e)}

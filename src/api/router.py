from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from services.camera_service import generate_frames, get_last_photo  
from services.generator_service import generate_image  

api_router = APIRouter()

@api_router.get('/video')
async def video_feed():
    return StreamingResponse(generate_frames(), media_type='multipart/x-mixed-replace; boundary=frame')

@api_router.get('/take_photo')
async def take_photo():
    return get_last_photo()

@api_router.post("/generate_image")
async def generate_image_endpoint(
    image: UploadFile = File(...),
    tags: str = Form(...),
    strength: float = Form(...),
    guidance_scale: float = Form(...)
):
    return await generate_image(image, tags, strength, guidance_scale)
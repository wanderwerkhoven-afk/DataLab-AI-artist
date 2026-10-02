import os

os.environ.setdefault("OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS", "0")

import cv2
from fastapi import Response

last_raw_frame = None

def generate_frames():
    global last_raw_frame
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    consecutive_failures = 0

    try:
        while True:
            success, frame = cap.read()
            if not success:
                consecutive_failures += 1
                if consecutive_failures > 30:
                    break
                continue
            consecutive_failures = 0

            last_raw_frame = frame.copy()

            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    finally:
        cap.release()

def get_last_photo():
    global last_raw_frame
    if last_raw_frame is None:
        return Response(content="No frame available", status_code=404)

    ret, buffer = cv2.imencode('.jpg', last_raw_frame)
    frame = buffer.tobytes()

    return Response(content=frame, media_type="image/jpeg")
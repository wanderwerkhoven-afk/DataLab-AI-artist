import cv2
from fastapi import Response

last_raw_frame = None

def generate_frames():
    global last_raw_frame
    cap = cv2.VideoCapture(0)

    while True:
        success, frame = cap.read()
        if not success:
            break

        last_raw_frame = frame.copy() 

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

def get_last_photo():
    global last_raw_frame
    if last_raw_frame is None:
        return Response(content="No frame available", status_code=404)

    ret, buffer = cv2.imencode('.jpg', last_raw_frame)
    frame = buffer.tobytes()

    return Response(content=frame, media_type="image/jpeg")
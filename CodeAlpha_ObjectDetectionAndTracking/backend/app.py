"""
Task 4 - Flask API for the React frontend.

Endpoints:
  POST /api/upload          upload a video file, returns its id
  GET  /video_feed?source=webcam | <upload_id>   annotated MJPEG stream
  GET  /api/stats           live fps / object counts / active tracks

Run:  python app.py   (http://localhost:5000)
"""
import os
import threading
import time
import uuid

import cv2
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from detector import Detector

BASE = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app)
detector = Detector(model_name="yolov8n.pt", conf=0.4)
detector_lock = threading.Lock()  # ByteTrack keeps state between calls; serialize access
uploads = {}  # id -> path
stop_event = threading.Event()  # set by /api/stop_stream to force-release the camera


def frame_generator(source):
    """Real-time video input (webcam or file), processed frame by frame."""
    cap = cv2.VideoCapture(0 if source == "webcam" else source)
    if not cap.isOpened():
        return

    is_file = source != "webcam"
    fps = cap.get(cv2.CAP_PROP_FPS) or 25

    try:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                if is_file:  # loop uploaded videos
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                break

            with detector_lock:
                frame = detector.annotate(frame)
            ok, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if not ok:
                continue
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n")

            if is_file:
                time.sleep(1.0 / fps)  # play files at natural speed
    finally:
        cap.release()


@app.get("/video_feed")
def video_feed():
    stop_event.clear()  # a fresh stream request overrides any earlier stop
    source = request.args.get("source", "webcam")
    if source != "webcam":
        path = uploads.get(source)
        if not path:
            return jsonify({"error": "unknown upload id"}), 404
        source = path
    return Response(
        frame_generator(source),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.post("/api/stop_stream")
def api_stop_stream():
    """
    Signals frame_generator to stop reading and release the camera on its
    very next loop check, instead of waiting for Flask to notice the client
    disconnected — that detection is timing-dependent and can lag.
    """
    stop_event.set()
    return jsonify({"stopped": True})


@app.post("/api/upload")
def upload():
    file = request.files.get("video")
    if not file:
        return jsonify({"error": "no file"}), 400
    uid = uuid.uuid4().hex[:8]
    path = os.path.join(UPLOAD_DIR, f"{uid}_{secure_filename(file.filename)}")
    file.save(path)
    uploads[uid] = path
    return jsonify({"id": uid, "name": file.filename})


@app.post("/api/detect_frame")
def detect_frame():
    """
    Stateless single-frame detection.
    Used for browser-captured webcam frames (see App.jsx) since the server
    can't open a camera it doesn't physically have — the browser captures
    the frame instead and posts it here for annotation.
    """
    file = request.files.get("frame")
    if not file:
        return jsonify({"error": "no frame"}), 400

    data = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if frame is None:
        return jsonify({"error": "could not decode frame"}), 400

    with detector_lock:
        annotated = detector.annotate(frame)

    ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return jsonify({"error": "encode failed"}), 500
    return Response(jpg.tobytes(), mimetype="image/jpeg")


@app.get("/api/stats")
def stats():
    return jsonify(detector.latest_stats)


if __name__ == "__main__":
    # threaded=True lets the MJPEG stream and /api/stats run simultaneously
    app.run(debug=True, port=5000, threaded=True)
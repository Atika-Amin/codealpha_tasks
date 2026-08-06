# Task 4 — Object Detection and Tracking 🎯

Real-time object detection and tracking. Python (OpenCV + pre-trained YOLOv8 + ByteTrack) does the vision work; a React app is the interface: pick webcam or upload a video, watch the annotated stream, and see live stats.

## How it maps to the task

| Requirement | Where |
|---|---|
| Real-time video input (webcam or file, OpenCV) | `backend/app.py` → `cv2.VideoCapture` |
| Pre-trained model (YOLO) | `backend/detector.py` → YOLOv8n (auto-downloads weights) |
| Process each frame, draw bounding boxes | `Detector.annotate()` |
| Object tracking (SORT-family) | `model.track(..., tracker="bytetrack.yaml", persist=True)` |
| Display output with labels + tracking IDs in real time | annotated MJPEG stream rendered in the React UI |

Each box shows a persistent tracking ID (`#12 person 0.87`) with a stable color per ID, plus an FPS counter.

## Run it

**Backend**
```bash
cd backend
pip install -r requirements.txt
python app.py            # http://localhost:5000  (YOLO weights download on first run)
```

**Frontend**
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Open the React app, click **Webcam** or **Upload video**, and the annotated stream appears with live FPS, active-track count, and per-class object counts (polled from `/api/stats` every second).

## Architecture

```
React UI ── GET /video_feed?source=webcam|<id> ──> Flask
                                                    │ per frame
                                          OpenCV read ─> YOLOv8 detect
                                                    │      + ByteTrack IDs
                                          draw boxes/labels/IDs ─> MJPEG out
React UI ── GET /api/stats (1s poll) ──> {fps, objects, active_tracks}
```

Swap `yolov8n.pt` for `yolov8s.pt`/`yolov8m.pt` in `detector.py` for higher accuracy (slower), or raise/lower `conf` to filter detections.

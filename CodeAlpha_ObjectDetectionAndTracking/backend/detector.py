"""
Task 4 - Object Detection and Tracking
YOLOv8 (pre-trained) for detection + ByteTrack (SORT-family) for tracking IDs.

Each frame: detect objects -> associate with existing tracks -> draw
bounding boxes, class labels, confidence, and a persistent tracking ID.
"""
import time
from collections import Counter

import cv2
from ultralytics import YOLO

# Distinct colors per track id (BGR)
PALETTE = [
    (80, 175, 76), (243, 150, 33), (54, 67, 244), (196, 39, 156),
    (7, 193, 255), (63, 81, 181), (139, 195, 74), (0, 188, 212),
]

class Detector:
    def __init__(self, model_name="yolov8n.pt", conf=0.4):
        self.model = YOLO(model_name)   # downloads pre-trained weights on first run
        self.conf = conf
        self.latest_stats = {"fps": 0, "objects": {}, "active_tracks": 0}

    def annotate(self, frame):
        """Run detection + tracking on one frame and draw the results."""
        t0 = time.time()

        # persist=True keeps track state between frames (SORT-style association)
        results = self.model.track(
            frame, persist=True, conf=self.conf, tracker="bytetrack.yaml", verbose=False
        )[0]

        counts = Counter()
        n_tracks = 0

        if results.boxes is not None:
            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_name = self.model.names[int(box.cls[0])]
                conf = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else -1

                counts[cls_name] += 1
                if track_id >= 0:
                    n_tracks += 1

                color = PALETTE[track_id % len(PALETTE)] if track_id >= 0 else (128, 128, 128)
                label = f"#{track_id} {cls_name} {conf:.2f}" if track_id >= 0 else f"{cls_name} {conf:.2f}"

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
                cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
                cv2.putText(frame, label, (x1 + 4, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        fps = 1.0 / max(time.time() - t0, 1e-6)
        cv2.putText(frame, f"FPS: {fps:.1f}", (12, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        self.latest_stats = {
            "fps": round(fps, 1),
            "objects": dict(counts),
            "active_tracks": n_tracks,
        }
        return frame

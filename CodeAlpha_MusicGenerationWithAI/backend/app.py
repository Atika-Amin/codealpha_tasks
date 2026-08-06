"""
Task 3 - Flask API that the React frontend talks to.

Run:  python app.py   (http://localhost:5000)
"""
import os

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from generate import OUTPUT_DIR, generate
from preprocess import NOTES_PATH

app = Flask(__name__)
CORS(app)


@app.get("/api/status")
def status():
    from generate import MODEL_PATH

    return jsonify(
        {
            "notes_ready": os.path.exists(NOTES_PATH),
            "model_trained": os.path.exists(MODEL_PATH),
        }
    )


@app.post("/api/generate")
def api_generate():
    if not os.path.exists(NOTES_PATH):
        return jsonify({"error": "Run preprocess.py first (no notes.pkl found)."}), 400

    body = request.get_json(silent=True) or {}
    length = int(body.get("length", 200))
    temperature = float(body.get("temperature", 1.0))

    path, method, n = generate(length=length, temperature=temperature)
    return jsonify({"file": os.path.basename(path), "method": method, "notes": n})


@app.get("/api/midi/<path:filename>")
def get_midi(filename):
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=False)


if __name__ == "__main__":
    app.run(debug=True, port=5000)

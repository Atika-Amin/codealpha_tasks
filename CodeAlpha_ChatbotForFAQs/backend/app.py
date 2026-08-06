"""
Task 2 - Flask backend for the FAQ Chatbot.

Endpoints:
  POST /api/ask     { question } -> best-matching FAQ answer + confidence
  GET  /api/faqs      list of all FAQ questions (used for suggested chips)
  GET  /api/health

Run:  python app.py   (http://localhost:5000)
"""
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from faq_matcher import FAQMatcher

BASE = os.path.dirname(__file__)
FAQS_PATH = os.environ.get("FAQS_PATH", os.path.join(BASE, "faqs.json"))

app = Flask(__name__)
CORS(app)

matcher = FAQMatcher(FAQS_PATH)


@app.post("/api/ask")
def ask():
    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()

    if not question:
        return jsonify({"error": "Please type a question."}), 400

    result = matcher.match(question)
    return jsonify(result)


@app.get("/api/faqs")
def faqs():
    return jsonify(matcher.all_questions())


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "faqCount": len(matcher.faqs)})


if __name__ == "__main__":
    app.run(debug=True, port=5000)

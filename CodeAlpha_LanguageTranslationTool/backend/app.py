"""
Task 1 - Flask backend for the Language Translation Tool.

Proxies translation requests to a translation provider, keeping any paid
API key server-side. A paid key must never be shipped to the browser —
anyone could read it out of a network request and rack up charges on your
account, and Google/Azure don't allow safe direct-from-browser calls anyway.

Supports four providers, switchable via the TRANSLATE_PROVIDER env var:
  google_free     (default) -> the free, unofficial endpoint the Google
                                Translate website itself uses. No API key,
                                no card, nothing to install — but it's not
                                an officially supported API, so Google can
                                rate-limit or block it without notice. Fine
                                for a demo/portfolio project, not something
                                to depend on for production traffic.
  libretranslate             -> self-hosted, free forever, no API key or
                                 card required, but needs Docker (or a
                                 native Python install) running locally.
                                 See the README.
  google                     -> Google Cloud Translate v2, the *official*
                                 API (needs a paid-tier key; free
                                 allowance, card required to sign up)
  azure                      -> Microsoft (Azure) Translator v3.0 (same)

Endpoints:
  POST /api/translate   { text, source, target } -> { translatedText, ... }
  GET  /api/health       reports which provider is active and configured

Run:  python app.py   (http://localhost:5000)
"""
import os
import uuid

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

PROVIDER = os.environ.get("TRANSLATE_PROVIDER", "google_free").lower()

GOOGLE_FREE_ENDPOINT = "https://translate.googleapis.com/translate_a/single"
# A browser-like User-Agent reduces (doesn't eliminate) the chance of this
# unofficial endpoint returning a bot-detection block.
GOOGLE_FREE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

LIBRETRANSLATE_URL = os.environ.get("LIBRETRANSLATE_URL", "http://localhost:5001")
# LibreTranslate/Argos uses slightly different codes than the ones this
# app's language list uses elsewhere (matched to Google/Azure conventions).
# Add overrides here if you add a language and hit a mismatch.
LIBRETRANSLATE_CODE_OVERRIDES = {"zh-CN": "zh"}

GOOGLE_API_KEY = os.environ.get("GOOGLE_TRANSLATE_API_KEY")
GOOGLE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2"

AZURE_API_KEY = os.environ.get("AZURE_TRANSLATOR_KEY")
AZURE_REGION = os.environ.get("AZURE_TRANSLATOR_REGION")
AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate"

app = Flask(__name__)
CORS(app)


def translate_google_free(text, source, target):
    params = {
        "client": "gtx",
        "sl": source or "auto",
        "tl": target,
        "dt": "t",
        "q": text,
    }
    try:
        res = requests.get(
            GOOGLE_FREE_ENDPOINT, params=params, headers=GOOGLE_FREE_HEADERS, timeout=10
        )
    except requests.RequestException as e:
        raise RuntimeError(
            "Couldn't reach Google's translation endpoint. It may be "
            "temporarily rate-limiting or blocking automated requests — "
            "try again in a bit."
        ) from e

    if not res.ok:
        raise RuntimeError(
            f"Google's translation endpoint returned {res.status_code}. "
            "It may be rate-limiting or blocking this request right now."
        )

    try:
        data = res.json()
        # Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
        # Long input gets split into multiple chunks that need rejoining.
        translated = "".join(chunk[0] for chunk in data[0] if chunk[0])
        detected = data[2] if len(data) > 2 else None
    except (ValueError, IndexError, TypeError) as e:
        raise RuntimeError("Unexpected response from Google's translation endpoint.") from e

    if not translated:
        raise RuntimeError("Translation failed. Please try again.")

    return translated, detected


def _libre_code(code):
    return LIBRETRANSLATE_CODE_OVERRIDES.get(code, code)


def translate_libretranslate(text, source, target):
    payload = {
        "q": text,
        "source": _libre_code(source) if source else "auto",
        "target": _libre_code(target),
        "format": "text",
    }
    try:
        res = requests.post(f"{LIBRETRANSLATE_URL}/translate", json=payload, timeout=15)
    except requests.RequestException as e:
        raise RuntimeError(
            "Couldn't reach LibreTranslate. Is the Docker container running? "
            "See the README for the docker run command."
        ) from e

    data = res.json()
    if not res.ok:
        raise RuntimeError(data.get("error", "LibreTranslate request failed."))

    return data["translatedText"], None


def translate_google(text, source, target):
    params = {"key": GOOGLE_API_KEY, "q": text, "target": target, "format": "text"}
    if source:
        params["source"] = source

    res = requests.post(GOOGLE_ENDPOINT, params=params, timeout=10)
    data = res.json()
    if not res.ok:
        raise RuntimeError(data.get("error", {}).get("message", "Google Translate request failed."))

    translation = data["data"]["translations"][0]
    return translation["translatedText"], translation.get("detectedSourceLanguage")


def translate_azure(text, source, target):
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_API_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
        "Content-Type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4()),
    }
    params = {"api-version": "3.0", "to": target}
    if source:
        params["from"] = source

    res = requests.post(
        AZURE_ENDPOINT, params=params, headers=headers, json=[{"Text": text}], timeout=10
    )
    data = res.json()
    if not res.ok:
        raise RuntimeError(
            data.get("error", {}).get("message", "Azure Translator request failed.")
        )

    result = data[0]
    translated = result["translations"][0]["text"]
    detected = result.get("detectedLanguage", {}).get("language")
    return translated, detected


@app.post("/api/translate")
def translate():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    source = body.get("source") or None
    target = body.get("target")

    if not text:
        return jsonify({"error": "No text provided."}), 400
    if not target:
        return jsonify({"error": "No target language provided."}), 400
    if source and source == target:
        return jsonify({"error": "Source and target languages must be different."}), 400

    try:
        if PROVIDER == "azure":
            if not (AZURE_API_KEY and AZURE_REGION):
                return jsonify(
                    {"error": "Server is missing AZURE_TRANSLATOR_KEY / AZURE_TRANSLATOR_REGION. See .env.example."}
                ), 500
            translated, detected = translate_azure(text, source, target)
        elif PROVIDER == "google":
            if not GOOGLE_API_KEY:
                return jsonify(
                    {"error": "Server is missing GOOGLE_TRANSLATE_API_KEY. See .env.example."}
                ), 500
            translated, detected = translate_google(text, source, target)
        elif PROVIDER == "libretranslate":
            translated, detected = translate_libretranslate(text, source, target)
        else:
            translated, detected = translate_google_free(text, source, target)
    except requests.RequestException:
        return jsonify({"error": "Could not reach the translation service."}), 502
    except (RuntimeError, KeyError, IndexError) as e:
        return jsonify({"error": str(e) or "Translation failed."}), 502

    return jsonify(
        {"translatedText": translated, "detectedSourceLanguage": detected, "provider": PROVIDER}
    )


@app.get("/api/health")
def health():
    if PROVIDER == "azure":
        configured = bool(AZURE_API_KEY and AZURE_REGION)
    elif PROVIDER == "google":
        configured = bool(GOOGLE_API_KEY)
    elif PROVIDER == "libretranslate":
        # LibreTranslate needs no key — "configured" just means we can reach it.
        try:
            requests.get(f"{LIBRETRANSLATE_URL}/languages", timeout=3)
            configured = True
        except requests.RequestException:
            configured = False
    else:
        configured = True  # google_free needs no key or setup at all
    return jsonify({"ok": True, "provider": PROVIDER, "configured": configured})


if __name__ == "__main__":
    app.run(debug=True, port=5000)

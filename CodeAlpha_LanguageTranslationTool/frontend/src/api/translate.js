// Translation client for the Language Translation Tool.
//
// This calls our own Flask backend (see /backend/app.py), which proxies
// the request to Google Cloud Translate or Microsoft Translator. The API
// key lives server-side only — a paid translation API key must never be
// shipped to browser code, where anyone could read it out of a network
// request and rack up charges on your account.
//
// To switch providers, set TRANSLATE_PROVIDER=azure in the backend's .env
// — nothing here needs to change.

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function translateText(text, source, target) {
  const res = await fetch(`${API}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source, target }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Translation service returned ${res.status}`);
  }
  if (!data.translatedText) {
    throw new Error("Translation failed. Please try again.");
  }

  return data.translatedText;
}

import { useEffect, useRef, useState } from "react";
import LanguageSelect from "./components/LanguageSelect";
import TextPanel from "./components/TextPanel";
import { translateText } from "./api/translate";
import { speechTagFor } from "./languages";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// A UX cap, not a hard API limit — Google Cloud Translate and Azure
// Translator both accept far longer requests than this. Capping input
// keeps the UI snappy and keeps each request's cost predictable.
const MAX_CHARS = 2000;

export default function App() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const handleTranslate = async () => {
    const text = inputText.trim();
    setError("");
    setSpeechError("");

    if (!text) {
      setError("Please enter some text to translate.");
      return;
    }
    if (sourceLang === targetLang) {
      setError("Source and target languages must be different.");
      return;
    }

    setLoading(true);
    setOutputText("");
    try {
      setOutputText(await translateText(text, sourceLang, targetLang));
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    // Carry the translation back to the input so re-translating feels natural
    if (outputText) {
      setInputText(outputText);
      setOutputText(inputText);
    }
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  // speechSynthesis.getVoices() can return an empty list on the very
  // first call in some browsers (notably Chrome) — voices load
  // asynchronously and the 'voiceschanged' event fires once they're ready.
  const getVoicesAsync = () =>
    new Promise((resolve) => {
      const existing = window.speechSynthesis.getVoices();
      if (existing.length) {
        resolve(existing);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    });

  // Fallback for when the browser/OS has no installed voice for the
  // requested language (common for e.g. Bengali on many systems). Calls
  // our backend, which generates an MP3 via gTTS — the same free,
  // unofficial Google endpoint the browser TTS can't use, since gTTS
  // doesn't depend on anything being installed locally.
  const speakViaBackend = (text, langCode) =>
    new Promise((resolve, reject) => {
      fetch(`${API}/api/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: langCode }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Text-to-speech request failed (${res.status})`);
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Audio playback failed."));
          };
          await audio.play();
        })
        .catch(reject);
    });

  const speak = async (text, langCode) => {
    if (!text || speaking) return;
    setSpeechError("");
    setSpeaking(true);

    try {
      if ("speechSynthesis" in window) {
        const targetTag = speechTagFor(langCode);
        const voices = await getVoicesAsync();
        const base = targetTag.split("-")[0].toLowerCase();
        const hasLocalVoice = voices.some(
          (v) =>
            v.lang.toLowerCase() === targetTag.toLowerCase() ||
            v.lang.toLowerCase().startsWith(base)
        );

        if (hasLocalVoice) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = targetTag;
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = (e) => {
            setSpeechError(`Speech playback failed (${e.error}).`);
            setSpeaking(false);
          };
          window.speechSynthesis.speak(utterance);
          return; // speaking cleared by onend/onerror above, not the finally
        }
      }

      // No local voice available (or SpeechSynthesis unsupported) — fall
      // back to a server-generated voice instead of failing silently.
      await speakViaBackend(text, langCode);
      setSpeaking(false);
    } catch (err) {
      setSpeechError(err.message || "Text-to-speech failed.");
      setSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            🌐 Language Translation Tool
          </h1>
          <p className="mt-2 text-slate-400">
            Translate text between languages instantly
          </p>
        </header>

        <main className="flex flex-col gap-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-end gap-3">
            <LanguageSelect
              label="From"
              value={sourceLang}
              onChange={setSourceLang}
            />
            <button
              onClick={handleSwap}
              title="Swap languages"
              aria-label="Swap languages"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-lg transition hover:rotate-180 hover:border-indigo-500 hover:bg-indigo-600"
            >
              ⇄
            </button>
            <LanguageSelect
              label="To"
              value={targetLang}
              onChange={setTargetLang}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextPanel
              value={inputText}
              onChange={(v) => {
                setInputText(v.slice(0, MAX_CHARS));
                setError("");
              }}
              placeholder="Enter text to translate..."
              maxLength={MAX_CHARS}
              footer={
                <>
                  <span>
                    {inputText.length} / {MAX_CHARS}
                  </span>
                  <button
                    onClick={() => speak(inputText, sourceLang)}
                    disabled={!inputText || speaking}
                    title="Listen to input text"
                    className="rounded-md px-2 py-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {speaking ? "🔊 …" : "🔊 Listen"}
                  </button>
                </>
              }
            />
            <TextPanel
              value={outputText}
              placeholder={
                loading ? "Translating..." : "Translation will appear here..."
              }
              readOnly
              footer={
                <>
                  <button
                    onClick={handleCopy}
                    disabled={!outputText}
                    title="Copy translation"
                    className="rounded-md px-2 py-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button
                    onClick={() => speak(outputText, targetLang)}
                    disabled={!outputText || speaking}
                    title="Listen to translation"
                    className="rounded-md px-2 py-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {speaking ? "🔊 …" : "🔊 Listen"}
                  </button>
                </>
              }
            />
          </div>

          <button
            onClick={handleTranslate}
            disabled={loading}
            className="mx-auto flex items-center gap-2 rounded-full bg-indigo-600 px-10 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "Translating..." : "Translate"}
          </button>

          <p
            role="status"
            className={`min-h-5 text-center text-sm ${
              error || speechError ? "text-red-400" : "text-transparent"
            }`}
          >
            {error || speechError || "."}
          </p>
        </main>

        <footer className="text-center text-xs text-slate-500">
          Powered by Google Translate's free public endpoint. See the
          README to switch to LibreTranslate (self-hosted), Google Cloud
          Translate, or Microsoft Translator instead.
        </footer>
      </div>
    </div>
  );
}

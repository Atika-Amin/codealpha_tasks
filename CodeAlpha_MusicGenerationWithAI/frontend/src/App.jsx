import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

const API = "http://localhost:5000";

const INK = "#1B1530";
const VIOLET = "#6D4AE8";
const VIOLET_DARK = "#5236C4";
const PAPER = "#F6F4FB";
const LINE = "#E2DCF4";

export default function App() {
  const [status, setStatus] = useState(null);
  const [length, setLength] = useState(200);
  const [temperature, setTemperature] = useState(1.0);
  const [busy, setBusy] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [playingFile, setPlayingFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setError("Backend not reachable — start Flask with `python app.py`."));
  }, []);

  const generateTrack = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ length, temperature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setTracks((t) => [{ ...data, time: new Date().toLocaleTimeString() }, ...t]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const partRef = useRef(null);
  const synthRef = useRef(null);

  const stopPlayback = () => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    setPlayingFile(null);
  };

  const play = async (file) => {
    if (playingFile) {
      stopPlayback();
      if (playingFile === file) return;
    }
    await Tone.start();
    const midi = await Midi.fromUrl(`${API}/api/midi/${file}`);
    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).toDestination();
    synthRef.current = synth;

    // Schedule notes on the Transport (via Tone.Part) instead of with
    // absolute triggerAttackRelease times — that's what lets stop()/cancel()
    // actually silence a playing track.
    const events = midi.tracks.flatMap((track) =>
      track.notes.map((n) => ({
        time: n.time,
        note: n.name,
        duration: n.duration || 0.4,
        velocity: n.velocity || 0.8,
      }))
    );

    const part = new Tone.Part((time, ev) => {
      synth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
    }, events).start(0);
    partRef.current = part;

    const transport = Tone.getTransport();
    transport.position = 0;
    transport.start();
    setPlayingFile(file);

    // Auto-reset the UI once the piece finishes on its own.
    transport.scheduleOnce(() => {
      stopPlayback();
    }, midi.duration + 0.5);
  };

  useEffect(() => stopPlayback, []); // cleanup on unmount

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <header style={S.header}>
          <div style={S.badge}>CodeAlpha · Task 3</div>
          <h1 style={S.h1}>Music Generation with AI</h1>
          <p style={S.sub}>
            MIDI dataset → music21 preprocessing → LSTM → new sequences → MIDI output
          </p>
          {status && (
            <div style={S.statusRow}>
              <Pill ok={status.notes_ready} label={status.notes_ready ? "notes preprocessed" : "run preprocess.py"} />
              <Pill ok={status.model_trained} label={status.model_trained ? "LSTM trained" : "LSTM not trained (Markov fallback)"} />
            </div>
          )}
        </header>

        <section style={S.panel}>
          <label style={S.label}>
            Sequence length — {length} notes
            <input
              type="range" min="50" max="500" step="10" value={length}
              onChange={(e) => setLength(+e.target.value)} style={S.slider}
            />
          </label>
          <label style={S.label}>
            Temperature — {temperature.toFixed(2)} <span style={S.hint}>(low = safe, high = experimental)</span>
            <input
              type="range" min="0.2" max="2" step="0.05" value={temperature}
              onChange={(e) => setTemperature(+e.target.value)} style={S.slider}
            />
          </label>
          <button style={{ ...S.btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={generateTrack}>
            {busy ? "Composing…" : "♪ Generate music"}
          </button>
          {error && <div style={S.error}>{error}</div>}
        </section>

        <section>
          <h2 style={S.h2}>Generated tracks</h2>
          {tracks.length === 0 && <p style={S.empty}>Nothing yet — generate your first piece above.</p>}
          {tracks.map((t) => (
            <div key={t.file} style={S.track}>
              <div>
                <div style={S.trackName}>{t.file}</div>
                <div style={S.trackMeta}>{t.notes} notes · {t.method} · {t.time}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.smallBtn} onClick={() => play(t.file)}>
                  {playingFile === t.file ? "■ Stop" : "▶ Play"}
                </button>
                <a style={{ ...S.smallBtn, textDecoration: "none" }} href={`${API}/api/midi/${t.file}`} download>
                  ↓ MIDI
                </a>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Pill({ ok, label }) {
  return (
    <span style={{ ...S.pill, background: ok ? "#E7F6EC" : "#FDF0E7", color: ok ? "#1B7A3D" : "#A65B1F" }}>
      {ok ? "●" : "○"} {label}
    </span>
  );
}

const S = {
  page: { minHeight: "100vh", background: PAPER, color: INK, fontFamily: "'Manrope', system-ui, sans-serif", display: "flex", justifyContent: "center", padding: "40px 16px" },
  shell: { width: "100%", maxWidth: 640 },
  header: { marginBottom: 28 },
  badge: { display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: VIOLET, marginBottom: 10 },
  h1: { fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 },
  sub: { color: "#6C6486", marginTop: 8, lineHeight: 1.5 },
  statusRow: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
  pill: { fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999 },
  panel: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: 24, boxShadow: "0 10px 40px -20px rgba(27,21,48,.25)" },
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 18 },
  hint: { fontWeight: 400, color: "#8A82A6", fontSize: 12 },
  slider: { width: "100%", marginTop: 8, accentColor: VIOLET },
  btn: { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: VIOLET, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  error: { marginTop: 12, fontSize: 13, color: "#B23A2F", background: "#FCEBE8", padding: "10px 14px", borderRadius: 10 },
  h2: { fontSize: 18, fontWeight: 800, margin: "30px 0 12px" },
  empty: { color: "#8A82A6", fontSize: 14 },
  track: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 18px", marginBottom: 10 },
  trackName: { fontWeight: 700, fontSize: 14 },
  trackMeta: { fontSize: 12, color: "#8A82A6", marginTop: 2 },
  smallBtn: { padding: "8px 14px", borderRadius: 10, border: `1px solid ${LINE}`, background: "#F6F4FB", color: VIOLET_DARK, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};

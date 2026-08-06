import { useEffect, useRef, useState } from "react";

const API = "http://localhost:5000";

const INK = "#101820";
const AMBER = "#F2A007";
const PANEL = "#182430";
const BORDER = "#263341";

export default function App() {
  const [source, setSource] = useState(null); // "webcam" | upload id
  const [uploadName, setUploadName] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // poll live stats while a stream is running
  useEffect(() => {
    if (!source) return;
    const t = setInterval(() => {
      fetch(`${API}/api/stats`)
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    }, 1000);
    return () => clearInterval(t);
  }, [source]);

  const startWebcam = () => {
    setError("");
    setUploadName("");
    setSource("webcam");
  };

  const uploadVideo = async (file) => {
    setError("");
    const form = new FormData();
    form.append("video", file);
    try {
      const res = await fetch(`${API}/api/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadName(data.name);
      setSource(data.id);
    } catch (e) {
      setError(e.message + " — is the Flask backend running on port 5000?");
    }
  };

  const stop = async () => {
    setSource(null);
    setStats(null);
    try {
      // Explicitly tell the backend to release the camera now, rather than
      // waiting for it to notice the dropped connection on its own — that
      // detection is timing-dependent and can lag well behind the UI.
      await fetch(`${API}/api/stop_stream`, { method: "POST" });
    } catch {
      // stream cleanup best-effort; nothing actionable to show the user here
    }
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <header style={S.header}>
          <div style={S.badge}>CodeAlpha · Task 4</div>
          <h1 style={S.h1}>Object Detection &amp; Tracking</h1>
          <p style={S.sub}>
            OpenCV video input → pre-trained YOLOv8 → per-frame bounding boxes →
            ByteTrack (SORT-family) IDs → live annotated stream
          </p>
        </header>

        {/* Source controls */}
        <div style={S.controls}>
          <button style={{ ...S.btn, ...(source === "webcam" ? S.btnActive : {}) }} onClick={startWebcam}>
            ⦿ Webcam
          </button>
          <button style={S.btn} onClick={() => fileRef.current?.click()}>
            ⇪ Upload video{uploadName ? ` — ${uploadName}` : ""}
          </button>
          <input
            ref={fileRef} type="file" accept="video/*" style={{ display: "none" }}
            onChange={(e) => e.target.files[0] && uploadVideo(e.target.files[0])}
          />
          {source && (
            <button style={{ ...S.btn, color: "#FF8577", borderColor: "#4A2B28" }} onClick={stop}>
              ■ Stop
            </button>
          )}
        </div>

        {error && <div style={S.error}>{error}</div>}

        {/* Live stream */}
        <div style={S.viewport}>
          {source ? (
            <img
              key={source}
              src={`${API}/video_feed?source=${source}`}
              alt="Annotated detection stream"
              style={S.stream}
            />
          ) : (
            <div style={S.placeholder}>
              Select the webcam or upload a video file to start real-time detection.
            </div>
          )}
        </div>

        {/* Live stats */}
        {stats && source && (
          <div style={S.statsGrid}>
            <Stat label="FPS" value={stats.fps} />
            <Stat label="Active tracks" value={stats.active_tracks} />
            <div style={S.objectsCard}>
              <div style={S.statLabel}>Objects in frame</div>
              <div style={S.tagRow}>
                {Object.keys(stats.objects || {}).length === 0 && (
                  <span style={{ color: "#5E7185", fontSize: 13 }}>none detected</span>
                )}
                {Object.entries(stats.objects || {}).map(([name, n]) => (
                  <span key={name} style={S.tag}>{name} × {n}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={S.statValue}>{value}</div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: INK, color: "#E8EEF4", fontFamily: "'Manrope', system-ui, sans-serif", display: "flex", justifyContent: "center", padding: "40px 16px" },
  shell: { width: "100%", maxWidth: 860 },
  header: { marginBottom: 24 },
  badge: { display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: AMBER, marginBottom: 10 },
  h1: { fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 },
  sub: { color: "#8CA0B3", marginTop: 8, lineHeight: 1.55, maxWidth: 640 },
  controls: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  btn: { padding: "11px 18px", borderRadius: 12, border: `1px solid ${BORDER}`, background: PANEL, color: "#E8EEF4", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  btnActive: { borderColor: AMBER, color: AMBER },
  error: { marginBottom: 14, fontSize: 13, color: "#FF9E93", background: "#2A1917", padding: "10px 14px", borderRadius: 10, border: "1px solid #4A2B28" },
  viewport: { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" },
  stream: { width: "100%", display: "block" },
  placeholder: { color: "#5E7185", fontSize: 14, padding: 40, textAlign: "center" },
  statsGrid: { display: "grid", gridTemplateColumns: "140px 140px 1fr", gap: 12, marginTop: 14 },
  statCard: { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" },
  objectsCard: { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" },
  statLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5E7185" },
  statValue: { fontSize: 26, fontWeight: 800, marginTop: 4, color: AMBER, fontVariantNumeric: "tabular-nums" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tag: { fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 999, background: "#22303E", border: `1px solid ${BORDER}` },
};
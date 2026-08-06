import { useEffect, useRef, useState } from "react";
import { askFaq, fetchFaqList } from "./api/ask";

const INK = "#0F172A";
const MUTED = "#64748B";
const PAPER = "#F8FAFC";
const BORDER = "#E2E8F0";
const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const TEAL_LIGHT = "#CCFBF1";
const AMBER = "#B45309";
const AMBER_LIGHT = "#FEF3C7";

let nextId = 1;
const newId = () => nextId++;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    fetchFaqList().then((faqs) => {
      // A handful of varied starter questions, not the whole list.
      const picks = faqs.filter((_, i) => i % 5 === 0).slice(0, 4);
      setSuggestions(picks.length ? picks : faqs.slice(0, 4));
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || sending) return;

    setMessages((m) => [...m, { id: newId(), sender: "user", text: question }]);
    setInput("");
    setSending(true);

    try {
      const result = await askFaq(question);
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          sender: "bot",
          text: result.answer,
          matchedQuestion: result.matchedQuestion,
          category: result.category,
          confidence: result.confidence,
          lowConfidence: result.lowConfidence,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          sender: "bot",
          text: err.message || "Something went wrong reaching the FAQ service.",
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <header style={S.header}>
          <div style={S.badge}>Task 2 · FAQ Chatbot</div>
          <h1 style={S.h1}>💬 Ask us anything</h1>
          <p style={S.sub}>
            NLTK preprocessing → TF-IDF vectors → cosine similarity →
            best-matching FAQ answer
          </p>
        </header>

        <div style={S.chatWindow}>
          {messages.length === 0 && (
            <div style={S.emptyState}>
              <p style={S.emptyText}>
                Try asking about orders, shipping, returns, payments, or your
                account — or pick one below.
              </p>
              <div style={S.chipRow}>
                {suggestions.map((s) => (
                  <button
                    key={s.question}
                    style={S.chip}
                    onClick={() => send(s.question)}
                  >
                    {s.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {sending && (
            <div style={S.rowBot}>
              <div style={{ ...S.bubble, ...S.botBubble }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form style={S.inputBar} onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            style={S.input}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            style={{
              ...S.sendBtn,
              opacity: !input.trim() || sending ? 0.5 : 1,
              cursor: !input.trim() || sending ? "not-allowed" : "pointer",
            }}
          >
            Send
          </button>
        </form>

        <footer style={S.footer}>
          Matches your question against a fixed FAQ set using TF-IDF +
          cosine similarity — it finds the closest wording, not true
          understanding, so an unusual phrasing may need a rephrase.
        </footer>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.sender === "user";
  return (
    <div style={isUser ? S.rowUser : S.rowBot}>
      <div
        style={{
          ...S.bubble,
          ...(isUser ? S.userBubble : S.botBubble),
          ...(message.isError ? S.errorBubble : {}),
        }}
      >
        {message.text}
        {!isUser && !message.isError && (
          <ConfidenceTag
            lowConfidence={message.lowConfidence}
            matchedQuestion={message.matchedQuestion}
          />
        )}
      </div>
    </div>
  );
}

function ConfidenceTag({ lowConfidence, matchedQuestion }) {
  if (lowConfidence) {
    return (
      <div style={S.lowConfidenceTag}>
        Not confident about this one — closest match was "{matchedQuestion}".
        Try rephrasing, or reach a human via the contact FAQ.
      </div>
    );
  }
  return <div style={S.matchedTag}>Matched: "{matchedQuestion}"</div>;
}

function TypingDots() {
  return (
    <div style={S.typingRow}>
      <span style={{ ...S.dot, animationDelay: "0ms" }} />
      <span style={{ ...S.dot, animationDelay: "150ms" }} />
      <span style={{ ...S.dot, animationDelay: "300ms" }} />
      <style>{`
        @keyframes faqDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: PAPER,
    color: INK,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "40px 16px",
  },
  shell: { width: "100%", maxWidth: 640, display: "flex", flexDirection: "column" },
  header: { marginBottom: 20, textAlign: "center" },
  badge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: TEAL_DARK,
    marginBottom: 8,
  },
  h1: { fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 },
  sub: { color: MUTED, marginTop: 8, lineHeight: 1.5, fontSize: 14 },
  chatWindow: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 18,
    padding: 20,
    minHeight: 380,
    maxHeight: 480,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 10px 40px -20px rgba(15,23,42,.15)",
  },
  emptyState: { textAlign: "center", padding: "20px 8px" },
  emptyText: { color: MUTED, fontSize: 14, marginBottom: 14 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: {
    fontSize: 13,
    fontWeight: 600,
    color: TEAL_DARK,
    background: TEAL_LIGHT,
    border: "none",
    borderRadius: 999,
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  rowUser: { display: "flex", justifyContent: "flex-end" },
  rowBot: { display: "flex", justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    padding: "10px 14px",
    borderRadius: 16,
    fontSize: 14.5,
    lineHeight: 1.5,
  },
  userBubble: { background: TEAL, color: "#fff", borderBottomRightRadius: 4 },
  botBubble: {
    background: PAPER,
    border: `1px solid ${BORDER}`,
    color: INK,
    borderBottomLeftRadius: 4,
  },
  errorBubble: { background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B" },
  matchedTag: { marginTop: 6, fontSize: 11.5, color: MUTED },
  lowConfidenceTag: {
    marginTop: 8,
    fontSize: 12,
    color: AMBER,
    background: AMBER_LIGHT,
    borderRadius: 8,
    padding: "6px 8px",
  },
  typingRow: { display: "flex", gap: 4, padding: "4px 2px" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: MUTED,
    display: "inline-block",
    animation: "faqDotBounce 1.2s infinite ease-in-out",
  },
  inputBar: { display: "flex", gap: 10, marginTop: 14 },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    fontSize: 14.5,
    fontFamily: "inherit",
    outline: "none",
  },
  sendBtn: {
    padding: "12px 22px",
    borderRadius: 12,
    border: "none",
    background: TEAL,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14.5,
    fontFamily: "inherit",
  },
  footer: { marginTop: 16, fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 1.5 },
};

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function askFaq(question) {
  const res = await fetch(`${API}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data; // { answer, matchedQuestion, category, confidence, lowConfidence }
}

export async function fetchFaqList() {
  const res = await fetch(`${API}/api/faqs`);
  if (!res.ok) return [];
  return res.json(); // [{ question, category }, ...]
}

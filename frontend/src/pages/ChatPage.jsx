import React, { useState, useRef, useEffect } from "react";
import { sendMessage } from "../services/api.js";

const MODELS = ["TinyLlama", "DistilGPT2", "Phi-2"];

export default function ChatPage() {
  const [model, setModel] = useState("TinyLlama");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await sendMessage(model, text);
      setMessages(prev => [...prev, { role: "assistant", text: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "⚠ " + (err?.response?.data?.detail || "Error generating response") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", padding: "16px 24px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f4f4f5", border: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Chat</div>
            <div style={{ color: "#71717a", fontSize: 12 }}>Test your fine-tuned model</div>
          </div>
        </div>
        <select value={model} onChange={e => setModel(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 13, background: "#fff", outline: "none" }}>
          {MODELS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", minHeight: 420, maxHeight: 520, overflowY: "auto", padding: 20, marginBottom: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa", fontSize: 14 }}>
            Send a message to start chatting with {model}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%", padding: "10px 14px", borderRadius: 14,
              background: m.role === "user" ? "#18181b" : "#f4f4f5",
              color: m.role === "user" ? "#fff" : "#18181b",
              fontSize: 14, lineHeight: 1.5,
              borderBottomRightRadius: m.role === "user" ? 4 : 14,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 14,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "#f4f4f5", borderRadius: 14, borderBottomLeftRadius: 4, padding: "10px 16px", fontSize: 20, letterSpacing: 2 }}>
              <span style={{ animation: "pulse 1s infinite" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type a message…"
          style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 14, outline: "none", background: "#fff" }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          padding: "12px 22px", borderRadius: 12, border: "none",
          background: "#18181b", color: "#fff", fontWeight: 600, fontSize: 14,
          opacity: loading || !input.trim() ? 0.5 : 1, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
        }}>Send ↑</button>
      </div>
    </div>
  );
}

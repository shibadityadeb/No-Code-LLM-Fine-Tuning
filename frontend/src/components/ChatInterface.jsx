import React, { useState } from "react";
import { sendMessage } from "../services/api";

// Chat component for interaction with the inference endpoint.
export default function ChatInterface({ modelName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendMessage(modelName, input.trim());
      setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", text: "Error generating response." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-white">Chat Interface</h2>
      <div className="mt-2 max-h-72 overflow-auto rounded bg-gray-950 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">No messages yet. Send a prompt above.</p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`my-1 rounded px-2 py-1 ${msg.role === "user" ? "bg-blue-500/20 text-blue-200" : "bg-green-500/20 text-green-200"}`}>
            <p className="text-xs uppercase tracking-wide text-gray-400">{msg.role}</p>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Send"}
        </button>
      </div>
    </div>
  );
}

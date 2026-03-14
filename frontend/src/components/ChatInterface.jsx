import React, { useState } from "react";
import { sendChatMessage } from "../services/api";

// Chat UI that sends messages to the backend inference endpoint.
export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;
    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const { response } = await sendChatMessage(input);
      setMessages((prev) => [...prev, { role: "assistant", text: response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", text: "Error generating response." }]);
    }
  };

  return (
    <div>
      <h2>Chat</h2>
      <div style={{ border: "1px solid #ddd", padding: 8, minHeight: 120 }}>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.role}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          style={{ width: "70%", marginRight: 8 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

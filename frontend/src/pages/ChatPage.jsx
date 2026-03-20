import React, { useEffect, useRef, useState } from "react";
import { Bot, CornerDownLeft, SendHorizonal } from "lucide-react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Input, { FieldLabel, Select } from "../components/Input.jsx";
import { getWorkspaceSnapshot, sendMessage } from "../services/api.js";

const MODELS = ["TinyLlama", "DistilGPT2", "Phi-2"];

export default function ChatPage() {
  const [model, setModel] = useState(MODELS[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [readyMessage, setReadyMessage] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const checkSnapshot = async () => {
      try {
        const snapshot = await getWorkspaceSnapshot();
        if (snapshot && snapshot.status !== "empty") {
          setReady(true);
          setReadyMessage("");
        } else {
          setReady(false);
          setReadyMessage("Fine-tune a model before chatting.");
        }
      } catch (error) {
        setReady(false);
        setReadyMessage("Fine-tune a model before chatting.");
      }
    };

    checkSnapshot();
  }, []);

  const handleSend = async () => {
    const nextMessage = input.trim();
    if (!nextMessage || loading || !ready) {
      return;
    }

    setMessages((current) => [...current, { role: "user", text: nextMessage }]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendMessage(model, nextMessage);
      setMessages((current) => [...current, { role: "assistant", text: response.response }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: error?.response?.data?.detail || "Unable to reach the model." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Chat playground</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Evaluate your adapter</h1>
            <p className="mt-2 text-sm text-gray-500">
              Run fast inference checks against your selected model inside the same dashboard system.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <FieldLabel>Active model</FieldLabel>
            <Select value={model} onChange={(event) => setModel(event.target.value)}>
              {MODELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Live conversation</h2>
              <p className="text-sm text-gray-500">Test prompts, latency, and response quality.</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col gap-4 bg-gray-50 px-5 py-5">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                <Bot size={24} />
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-900">No messages yet</p>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Start with a prompt like "Summarize this dataset schema" or "Write a concise system prompt".
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-green-500 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSend();
                }
              }}
              placeholder="Ask your model a question..."
              disabled={!ready}
            />
            <Button
              disabled={loading || !input.trim() || !ready}
              onClick={handleSend}
              className="sm:min-w-[140px]"
            >
              <SendHorizonal size={16} />
              Send
            </Button>
          </div>
          {readyMessage && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {readyMessage}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <CornerDownLeft size={14} />
            Press Enter to send
          </div>
        </div>
      </Card>
    </div>
  );
}

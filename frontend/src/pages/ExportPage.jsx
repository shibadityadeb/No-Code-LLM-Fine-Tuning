import React, { useState } from "react";
import { downloadModel } from "../services/api.js";

const MODELS = ["TinyLlama", "DistilGPT2", "Phi-2"];

export default function ExportPage() {
  const [model, setModel] = useState("TinyLlama");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    setError(""); setSuccess(false); setLoading(true);
    try {
      await downloadModel(model);
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Adapter not found. Train the model first.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f4f4f5", border: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Export Adapter</div>
            <div style={{ color: "#71717a", fontSize: 12 }}>Download your trained LoRA adapter</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#52525b", marginBottom: 6 }}>Model</div>
          <select value={model} onChange={e => { setModel(e.target.value); setSuccess(false); setError(""); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 14, background: "#fff", outline: "none" }}>
            {MODELS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#52525b" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>What's included</div>
          <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>adapter_model.safetensors</li>
            <li>adapter_config.json</li>
            <li>tokenizer files</li>
          </ul>
        </div>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>⚠ {error}</div>}
        {success && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", color: "#16a34a", fontSize: 13, marginBottom: 14 }}>✓ Download started!</div>}

        <button onClick={handleDownload} disabled={loading} style={{
          width: "100%", padding: "12px", borderRadius: 12, border: "none",
          background: "#18181b", color: "#fff", fontWeight: 600, fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {loading ? "⏳ Preparing…" : "⬇ Download Adapter (.zip)"}
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { uploadDataset, startTraining, getTrainingStatus } from "../services/api.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import ModelCompare from "../components/ModelCompare";

const MODELS = ["TinyLlama", "DistilGPT2", "Phi-2"];

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "#52525b", marginBottom: 6 }}>{children}</div>;
}

function Select({ value, onChange, options, style = {} }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: "100%", padding: "9px 12px", borderRadius: 10,
      border: "1px solid #e4e4e7", background: "#fff",
      fontSize: 14, color: "#18181b", outline: "none",
      appearance: "auto", ...style,
    }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Input({ value, onChange, type = "text", placeholder, style = {} }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={{
        width: "100%", padding: "9px 12px", borderRadius: 10,
        border: "1px solid #e4e4e7", background: "#fff",
        fontSize: 14, color: "#18181b", outline: "none", ...style,
      }} />
  );
}

function Btn({ children, onClick, variant = "default", style = {}, disabled = false }) {
  const base = {
    padding: "9px 16px", borderRadius: 10, border: "1px solid #e4e4e7",
    fontSize: 13, fontWeight: 500, display: "inline-flex",
    alignItems: "center", gap: 6, transition: "opacity .15s",
    opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
  };
  const variants = {
    default: { background: "#fff", color: "#18181b" },
    primary: { background: "#18181b", color: "#fff", border: "none" },
    green: { background: "#22c55e", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 600, width: "100%", justifyContent: "center" },
    danger: { background: "#fff", color: "#ef4444", border: "1px solid #fca5a5" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", padding: 24, ...style }}>{children}</div>;
}

function SectionHead({ icon, title, subtitle, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f4f4f5", border: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          {badge && <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: "1px solid #bbf7d0" }}>{badge}</span>}
        </div>
        <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

export default function Studio() {
  const [model, setModel] = useState("TinyLlama");
  const [epochs, setEpochs] = useState("3");
  const [lr, setLr] = useState("0.00005");
  const [batchSize, setBatchSize] = useState("4");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState("");
  const [status, setStatus] = useState(null);
  const [lossHistory, setLossHistory] = useState([]);
  const pollRef = useRef(null);
  const fileRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadError("");
    setUploading(true);
    try {
      const meta = await uploadDataset(file);
      setUploadMeta(meta);
    } catch (err) {
      setUploadError(err?.response?.data?.detail || "Upload failed");
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!uploadedFile) return;
    setTrainError("");
    setLossHistory([]);
    setTraining(true);
    try {
      await startTraining(model, uploadedFile.name);
      pollRef.current = setInterval(async () => {
        try {
          const s = await getTrainingStatus();
          setStatus(s);
          if (s.loss !== null) {
            setLossHistory(prev => {
              const point = { step: (prev.length + 1), loss: parseFloat(s.loss.toFixed(4)) };
              const next = [...prev, point];
              return next.slice(-30);
            });
          }
          if (!s.running && s.progress === 100) {
            clearInterval(pollRef.current);
            setTraining(false);
          }
        } catch (_) {}
      }, 2000);
    } catch (err) {
      setTrainError(err?.response?.data?.detail || "Training failed to start");
      setTraining(false);
    }
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const avgLoss = lossHistory.length ? (lossHistory.reduce((a, b) => a + b.loss, 0) / lossHistory.length).toFixed(4) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Model Row */}
      <Card>
        <SectionHead icon="🤖" title="Model" subtitle="Select base model and training method" badge="LoRA Fine-tuning" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <Label>Base Model</Label>
            <Select value={model} onChange={setModel} options={MODELS} />
          </div>
          <div>
            <Label>Method</Label>
            <div style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e4e4e7", background: "#18181b", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              LoRA (16-bit)
            </div>
          </div>
          <div>
            <Label>HuggingFace Token (Optional)</Label>
            <Input value="" onChange={() => {}} placeholder="hf_..." />
          </div>
        </div>
      </Card>

      {/* 3-column panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Dataset */}
        <Card>
          <SectionHead icon="🗄️" title="Dataset" subtitle="Upload training data" />

          <Label>Upload File (CSV / JSON / TXT)</Label>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              border: "2px dashed #e4e4e7", borderRadius: 12, padding: "28px 16px",
              textAlign: "center", cursor: "pointer", marginBottom: 12,
              background: uploadedFile ? "#f0fdf4" : "#fafafa",
              transition: "background .2s",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
            {uploadedFile
              ? <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{uploadedFile.name}</div>
              : <div style={{ fontSize: 13, color: "#71717a" }}>Click to browse or drag & drop</div>}
            {uploading && <div style={{ fontSize: 12, color: "#6366f1", marginTop: 4 }}>Uploading…</div>}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.json,.txt" style={{ display: "none" }} onChange={handleFileChange} />

          {uploadError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>⚠ {uploadError}</div>}

          {uploadMeta && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: "#15803d" }}>✓ {uploadMeta.file_name}</div>
              <div style={{ color: "#52525b", marginTop: 2 }}>{uploadMeta.rows} rows · {(uploadMeta.size_bytes / 1024).toFixed(1)} KB</div>
            </div>
          )}

          <Btn onClick={() => fileRef.current.click()} style={{ width: "100%", justifyContent: "center" }}>
            ⬆ {uploadedFile ? "Replace File" : "Upload"}
          </Btn>
        </Card>

        {/* Parameters */}
        <Card>
          <SectionHead icon="⚙️" title="Parameters" subtitle="Configure training hyperparameters" />

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label>Epochs</Label>
              <Input type="number" value={epochs} onChange={setEpochs} />
              <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 4 }}>Number of full passes over the dataset</div>
            </div>
            <div>
              <Label>Learning Rate</Label>
              <Input type="number" value={lr} onChange={setLr} />
              <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 4 }}>Recommended: 2e-4 for LoRA, 2e-5 for full fine-tune</div>
            </div>
            <div>
              <Label>Batch Size</Label>
              <Select value={batchSize} onChange={setBatchSize} options={["1", "2", "4", "8", "16"]} />
            </div>
          </div>
        </Card>

        {/* Training */}
        <Card>
          <SectionHead icon="📈" title="Training" subtitle="Monitor and control training" />

          {/* Loss Chart */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#52525b", marginBottom: 8 }}>Training Loss</div>
            {lossHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={lossHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  {avgLoss && <ReferenceLine y={parseFloat(avgLoss)} stroke="#f97316" strokeDasharray="4 2" />}
                  <Line type="monotone" dataKey="loss" stroke="#6366f1" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, background: "#f9f9f9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa", fontSize: 13 }}>
                {training ? "Waiting for first epoch…" : "Loss chart will appear here"}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {status && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#52525b", marginBottom: 4 }}>
                <span>Epoch {status.epoch ?? 0} / {status.total_epochs ?? "?"}</span>
                <span>{status.progress?.toFixed(0) ?? 0}%</span>
              </div>
              <div style={{ height: 6, background: "#e4e4e7", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${status.progress ?? 0}%`, background: "linear-gradient(90deg,#6366f1,#22c55e)", borderRadius: 99, transition: "width .4s" }} />
              </div>
              {status.loss !== null && <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>Loss: {status.loss?.toFixed(4)}</div>}
            </div>
          )}

          {trainError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>⚠ {trainError}</div>}

          {!training && status?.progress === 100 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
              ✓ Training complete! Adapter saved.
            </div>
          )}

          <Btn
            variant="green"
            onClick={handleStartTraining}
            disabled={!uploadedFile || training || uploading}
          >
            {training ? "⏳ Training…" : "🚀 Start Training"}
          </Btn>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <Btn onClick={() => { setStatus(null); setLossHistory([]); setTraining(false); }}>↺ Reset</Btn>
            <Btn onClick={() => window.open(`http://localhost:8000/api/download-model/${model}`)}>⬇ Download</Btn>
          </div>
        </Card>
      </div>
      <div style={{ marginTop: 24 }}>
        <ModelCompare />
      </div>
    </div>
  );
}

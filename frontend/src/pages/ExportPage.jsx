import React, { useState } from "react";
import { Download, FileArchive, FolderDown } from "lucide-react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { FieldLabel, Select } from "../components/Input.jsx";
import { downloadModel } from "../services/api.js";

const MODELS = ["TinyLlama", "DistilGPT2", "Phi-2"];
const FILES = [
  "adapter_model.safetensors",
  "adapter_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
];

export default function ExportPage() {
  const [model, setModel] = useState(MODELS[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleDownload = async () => {
    setLoading(true);
    setMessage("");

    try {
      await downloadModel(model);
      setMessage("Download started.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Adapter not found yet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Export center</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Package your adapter</h1>
            <p className="mt-2 text-sm text-gray-500">
              Download trained assets in a clean deployment bundle for inference or sharing.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
            <FolderDown size={16} />
            Production-ready bundle
          </div>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Download adapter</h2>
              <p className="text-sm text-gray-500">Select a trained model and export its LoRA files.</p>
            </div>
          </div>

          <div className="mt-6">
            <FieldLabel>Model</FieldLabel>
            <Select value={model} onChange={(event) => setModel(event.target.value)}>
              {MODELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </div>

          <Button className="mt-6 w-full" disabled={loading} onClick={handleDownload}>
            <Download size={16} />
            {loading ? "Preparing..." : "Download Adapter"}
          </Button>

          {message && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {message}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <FileArchive size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Included files</h2>
              <p className="text-sm text-gray-500">Everything needed to reload the adapter later.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {FILES.map((file) => (
              <div
                key={file}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700"
              >
                {file}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

import React, { useState } from "react";
import ModelSelector from "../components/ModelSelector";
import DatasetUpload from "../components/DatasetUpload";
import TrainingProgress from "../components/TrainingProgress";
import ChatInterface from "../components/ChatInterface";
import DownloadModel from "../components/DownloadModel";

// Main dashboard page combining all training + inference UI pieces.
export default function Dashboard() {
  const [selectedModel, setSelectedModel] = useState("TinyLlama");
  const [datasetFile, setDatasetFile] = useState("");

  const onDatasetUploaded = (meta) => {
    if (meta?.file_name) {
      setDatasetFile(meta.file_name);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-lg">
          <h1 className="text-3xl font-bold">llm-finetune-studio Dashboard</h1>
          <p className="mt-2 text-gray-400">Upload a dataset, start training LoRA, chat with the model, and download your adapter.</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
            <ModelSelector model={selectedModel} onChange={setSelectedModel} />
            <div className="mt-3 text-sm text-gray-300">
              <p>
                Selected model: <strong>{selectedModel}</strong>
              </p>
              <p>
                Dataset: <strong>{datasetFile || "None uploaded"}</strong>
              </p>
            </div>
          </div>

          <DatasetUpload onUploaded={onDatasetUploaded} />
        </section>

        <TrainingProgress modelName={selectedModel} datasetName={datasetFile} />

        <section className="grid gap-6 lg:grid-cols-2">
          <ChatInterface modelName={selectedModel} />
          <DownloadModel modelName={selectedModel} />
        </section>
      </div>
    </div>
  );
}

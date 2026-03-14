import React, { useState } from "react";
import ModelSelector from "../components/ModelSelector";
import DatasetUpload from "../components/DatasetUpload";
import TrainingProgress from "../components/TrainingProgress";
import ChatInterface from "../components/ChatInterface";
import DownloadModel from "../components/DownloadModel";

// A dashboard that ties together core workflow components.
export default function Dashboard() {
  const [model, setModel] = useState("gpt-2");
  const [trainingStatus, setTrainingStatus] = useState("idle");
  const [progress, setProgress] = useState(null);

  return (
    <div>
      <h2>Dashboard</h2>
      <ModelSelector model={model} onChange={setModel} />
      <DatasetUpload onUploaded={() => setTrainingStatus("ready")} />
      <TrainingProgress status={trainingStatus} progress={progress} />
      <ChatInterface />
      <DownloadModel />
    </div>
  );
}

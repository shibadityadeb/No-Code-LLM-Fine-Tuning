import React, { useEffect, useState } from "react";
import { getTrainingStatus, startTraining } from "../services/api";

// Training control panel with start button, status, progress, and polling.
export default function TrainingProgress({ modelName, datasetName }) {
  const [status, setStatus] = useState("idle");
  const [info, setInfo] = useState({ epoch: 0, total_epochs: 0, loss: 0, progress: 0 });
  const [jobId, setJobId] = useState(null);

  const fetchStatus = async () => {
    try {
      const data = await getTrainingStatus();
      setInfo(data);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  const handleStart = async () => {
    if (!modelName || !datasetName) {
      setStatus("Please select model & upload dataset first.");
      return;
    }

    setStatus("starting");
    try {
      const data = await startTraining(modelName, datasetName);
      setJobId(data.job_id);
      setStatus("running");
      await fetchStatus();
    } catch (err) {
      console.error(err);
      setStatus(err?.response?.data?.detail ?? "Failed to start training");
    }
  };

  useEffect(() => {
    let interval;
    if (status === "running") {
      interval = setInterval(async () => {
        const data = await getTrainingStatus();
        setInfo(data);

        if (!data.running || (data.progress >= 100 && data.progress > 0)) {
          setStatus("completed");
          clearInterval(interval);
        }
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [status]);

  const percent = info.progress ?? 0;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Training</h2>
        <button
          onClick={handleStart}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
        >
          Start Training
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-300">{status === "completed" ? "Training complete" : status === "running" ? "Training in progress" : status}</p>

      <div className="mt-3 h-3 w-full overflow-hidden rounded bg-gray-700">
        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-300" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-3 space-y-1 text-sm text-gray-200">
        <p>Epoch: {info.epoch ?? "-"} / {info.total_epochs ?? "-"}</p>
        <p>Loss: {info.loss != null ? info.loss.toFixed(4) : "-"}</p>
        <p>Progress: {percent.toFixed(1)}%</p>
        {jobId && <p>Job ID: {jobId}</p>}
      </div>
    </div>
  );
}

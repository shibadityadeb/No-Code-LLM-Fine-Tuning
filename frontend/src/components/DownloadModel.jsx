import React, { useState } from "react";
import { downloadModel } from "../services/api";

// Download component to fetch the trained adapter zip from backend.
export default function DownloadModel({ modelName }) {
  const [status, setStatus] = useState("");

  const handleDownload = async () => {
    if (!modelName) {
      setStatus("Select a model first.");
      return;
    }
    setStatus("Downloading...");
    try {
      await downloadModel(modelName);
      setStatus("Download initiated. Check browser downloads.");
    } catch (err) {
      console.error(err);
      setStatus(err?.response?.data?.detail ?? "Download failed.");
    }
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-white">Download Model</h2>
      <button
        onClick={handleDownload}
        className="mt-3 rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
      >
        Download {modelName || "Adapter"}
      </button>
      <p className="mt-2 text-sm text-gray-300">{status}</p>
    </div>
  );
}

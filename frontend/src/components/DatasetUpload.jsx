import React, { useState } from "react";
import { uploadDataset } from "../services/api";

// Component to upload dataset to backend; fires callback with returned metadata.
export default function DatasetUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [meta, setMeta] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file first.");
      return;
    }

    setStatus("Uploading...");
    try {
      const data = await uploadDataset(file);
      setStatus("Upload successful");
      setMeta(data);
      onUploaded(data);
    } catch (err) {
      console.error(err);
      setStatus(err?.response?.data?.detail ?? "Upload failed");
      setMeta(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-white">Dataset Upload</h2>
      <p className="text-sm text-gray-400">CSV, JSON, or TXT files only (max 500 rows, 2MB).</p>

      <input
        type="file"
        accept=".csv,.json,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mt-2 block w-full text-sm text-gray-200 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold"
      />

      <button
        onClick={handleUpload}
        disabled={!file}
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-500"
      >
        Upload Dataset
      </button>

      <p className="mt-2 text-sm text-gray-300">{status}</p>

      {meta && (
        <div className="mt-2 rounded border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">
          <p><strong>File:</strong> {meta.file_name}</p>
          <p><strong>Rows:</strong> {meta.rows}</p>
          <p><strong>Size:</strong> {meta.size_bytes} bytes</p>
        </div>
      )}
    </div>
  );
}

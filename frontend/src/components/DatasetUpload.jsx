import React, { useState } from "react";
import { uploadDataset } from "../services/api";

// UI for uploading a dataset to the backend.
export default function DatasetUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    try {
      await uploadDataset(file);
      setStatus("Upload complete.");
      onUploaded();
    } catch (err) {
      console.error(err);
      setStatus("Upload failed.");
    }
  };

  return (
    <div>
      <h2>Upload Dataset</h2>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={handleUpload} disabled={!file}>
        Upload
      </button>
      <p>{status}</p>
    </div>
  );
}

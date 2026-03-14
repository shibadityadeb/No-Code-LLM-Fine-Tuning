import React from "react";
import { downloadAdapter } from "../services/api";

// Simple download button for the trained adapter.
export default function DownloadModel() {
  const handleDownload = async () => {
    try {
      await downloadAdapter();
      alert("Download started (check browser downloads folder).");
    } catch (err) {
      console.error(err);
      alert("Download failed.");
    }
  };

  return (
    <div>
      <h2>Download Adapter</h2>
      <button onClick={handleDownload}>Download</button>
    </div>
  );
}

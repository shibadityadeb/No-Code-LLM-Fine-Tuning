import React from "react";

// Displays simple training progress state.
export default function TrainingProgress({ status, progress }) {
  return (
    <div>
      <h2>Training Progress</h2>
      <p>Status: {status}</p>
      <p>Progress: {progress ?? "N/A"}</p>
    </div>
  );
}

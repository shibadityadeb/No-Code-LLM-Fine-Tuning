import React from "react";

// Component for selecting a base model and LoRA options.
export default function ModelSelector({ model, onChange }) {
  return (
    <div>
      <h2>Model Selector</h2>
      <select value={model} onChange={(e) => onChange(e.target.value)}>
        <option value="gpt-2">GPT-2 (demo)</option>
        <option value="llama-2">LLaMA-2 (demo)</option>
      </select>
    </div>
  );
}

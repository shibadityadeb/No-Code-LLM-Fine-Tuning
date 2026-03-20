import React from "react";

// Model selector dropdown component.
export default function ModelSelector({ model, onChange }) {
  return (
    <div className="space-y-2">
      <label htmlFor="model" className="text-sm text-gray-300">
        Select model
      </label>
      <select
        id="model"
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
      >
        <option value="TinyLlama">TinyLlama</option>
        <option value="Phi-2">Phi-2</option>
        <option value="DistilGPT2">DistilGPT2</option>
      </select>
    </div>
  );
}

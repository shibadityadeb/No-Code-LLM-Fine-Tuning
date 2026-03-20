import React, { useState } from "react";
import { compareModels } from "../services/api";

const MODEL_OPTIONS = ["TinyLlama", "Phi-2", "DistilGPT2"];

// Model comparison helps evaluate differences in generation quality, style,
// and correctness across candidate models for the same prompt.
export default function ModelCompare() {
  const [selectedModels, setSelectedModels] = useState(["TinyLlama", "Phi-2", "DistilGPT2"]);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onToggleModel = (model) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const getKeywordScore = (response, queryText) => {
    if (!queryText || !response) return 0;
    const keywords = queryText
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2);
    if (!keywords.length) return 0;

    const responseLower = response.toLowerCase();
    const hits = keywords.reduce((acc, w) => acc + (responseLower.includes(w) ? 1 : 0), 0);
    return Math.round((hits / keywords.length) * 100);
  };

  const handleCompare = async () => {
    if (!query.trim()) {
      setError("Please enter a query for comparison.");
      return;
    }

    if (!selectedModels.length) {
      setError("Select at least one model.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const responses = await compareModels(query.trim(), selectedModels);
      setResult(responses);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to compare models.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-white">Model Comparison</h2>
      <p className="text-sm text-gray-400 mt-1">Compare multiple models side-by-side for the same input prompt.</p>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {MODEL_OPTIONS.map((model) => (
          <button
            key={model}
            className={`rounded px-3 py-2 text-sm font-semibold ${
              selectedModels.includes(model)
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            }`}
            onClick={() => onToggleModel(model)}
          >
            {model}
          </button>
        ))}
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter a query to compare models..."
        className="mt-3 w-full resize-none rounded border border-gray-700 bg-gray-800 p-3 text-sm text-white outline-none"
        rows={3}
      />

      <div className="mt-2 flex gap-2">
        <button
          onClick={handleCompare}
          disabled={loading}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Evaluating..." : "Compare Models"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(result).map(([modelName, response]) => {
            const length = response?.length ?? 0;
            const keywordScore = getKeywordScore(response, query);
            return (
              <div key={modelName} className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                <h3 className="text-base font-semibold text-white">{modelName}</h3>
                <p className="text-xs text-gray-400 mt-1">Length: {length} chars</p>
                <p className="text-xs text-gray-400">Keyword score: {keywordScore}%</p>
                <div className="mt-2 rounded border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100">
                  {response || "No response available"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        Model comparison evaluates textual differences and relevance for the same prompt, helping to select best architecture/version for your use case.
      </div>
    </div>
  );
}

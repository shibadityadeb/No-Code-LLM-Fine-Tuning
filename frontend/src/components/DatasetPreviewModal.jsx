import React, { useState, useEffect } from "react";
import { X, Loader } from "lucide-react";
import { viewDataset } from "../services/api.js";

export default function DatasetPreviewModal({ fileName, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (isOpen && fileName) {
      fetchPreview();
    }
  }, [isOpen, fileName]);

  const fetchPreview = async () => {
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const data = await viewDataset(fileName);
      setPreview(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load dataset preview");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dataset Preview</h2>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={24} className="animate-spin text-green-600" />
              <span className="ml-3 text-gray-600">Loading preview...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : preview && preview.preview_rows && preview.preview_rows.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
                <span>
                  Total rows in preview: <strong>{preview.total_rows}</strong>
                </span>
              </div>

              {/* Table view */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.columns && preview.columns.length > 0
                        ? preview.columns.map((col) => (
                            <th
                              key={col}
                              className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-700"
                            >
                              {col}
                            </th>
                          ))
                        : null}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview_rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {preview.columns && preview.columns.length > 0
                          ? preview.columns.map((col) => (
                              <td
                                key={`${idx}-${col}`}
                                className="border-b border-gray-100 px-4 py-3 text-sm text-gray-900"
                              >
                                <div className="line-clamp-3 max-w-xs break-words">
                                  {String(row[col] || "—")}
                                </div>
                              </td>
                            ))
                          : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600">No data to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

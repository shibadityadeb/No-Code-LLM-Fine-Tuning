import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpFromLine,
  ChartSpline,
  Database,
  FolderSearch,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Eye,
  AlertCircle,
  Download,
  Check,
  MessageSquare,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Input, { FieldHint, FieldLabel, Select } from "../components/Input.jsx";
import DatasetPreviewModal from "../components/DatasetPreviewModal.jsx";
import { uploadDataset, startTraining, getTrainingStatus, saveWorkspace, downloadModel, getWorkspaceSnapshot } from "../services/api.js";

const BASE_MODELS = ["TinyLlama", "Phi-2", "DistilGPT2", "Mistral 7B"];
const METHODS = ["LoRA", "QLoRA", "Full Fine-tune"];
const DATASET_TYPES = ["Instruction", "Chat", "QA", "Completion"];
const SPLITS = ["Train split", "Validation split", "Full dataset"];

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "default" }) {
  const toneClass =
    tone === "positive"
      ? "text-green-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-gray-900";

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function SliderField({ label, value, min, max, step = 1, onChange, hint }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm text-gray-500">{label}</label>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-2 w-full cursor-pointer accent-green-500"
      />
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="text-gray-500">Step {payload[0].payload.step}</p>
      <p className="mt-1 font-medium text-gray-900">Loss {payload[0].value}</p>
    </div>
  );
}

export default function Studio({ darkMode = false, onOpenChat }) {
  const [model, setModel] = useState(BASE_MODELS[0]);
  const [method, setMethod] = useState(METHODS[0]);
  const [token, setToken] = useState("");

  const [datasetSearch, setDatasetSearch] = useState("");
  const [datasetType, setDatasetType] = useState(DATASET_TYPES[0]);
  const [datasetSplit, setDatasetSplit] = useState(SPLITS[0]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef(null);

  const [params, setParams] = useState({
    steps: 800,
    epochs: 3,
    learningRate: 0.0002,
    batchSize: 4,
  });

  const [status, setStatus] = useState(null);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lossHistory, setLossHistory] = useState([
    { step: 1, loss: 2.31 },
    { step: 2, loss: 1.97 },
    { step: 3, loss: 1.71 },
    { step: 4, loss: 1.43 },
    { step: 5, loss: 1.26 },
  ]);
  const [training, setTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const pollRef = useRef(null);
  const lastLossRef = useRef(null);  // Track last loss to avoid duplicates

  const themeClass = darkMode
    ? "bg-white/95"
    : "bg-white";

  const datasetSummary = useMemo(() => {
    if (!uploadMeta) {
      return "No dataset uploaded yet";
    }

    return `${uploadMeta.file_name} • ${uploadMeta.rows} rows`;
  }, [uploadMeta]);


  useEffect(() => {
    // Fetch saved snapshot on component mount
    const fetchSnapshot = async () => {
      try {
        const data = await getWorkspaceSnapshot();
        if (data && data.status !== "empty") {
          setSnapshot(data);
        }
      } catch (error) {
        // No snapshot yet, which is fine
      }
    };
    fetchSnapshot();

    return () => clearInterval(pollRef.current);
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadError("");
    setTrainingMessage("");

    try {
      const meta = await uploadDataset(file);
      setUploadedFile(file);
      setUploadMeta(meta);
    } catch (error) {
      setUploadError(error?.response?.data?.detail || "Upload failed");
      setUploadedFile(null);
      setUploadMeta(null);
    } finally {
      setUploading(false);
    }
  };


  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      const validTypes = [".csv", ".json", ".txt"];
      const fileExt = "." + file.name.split(".").pop().toLowerCase();
      if (validTypes.includes(fileExt)) {
        handleFileUpload(file);
      } else {
        setUploadError("Invalid file type. Please upload CSV, JSON, or TXT file.");
      }
    }
  };

  const handleStartTraining = async () => {
    if (!uploadedFile) {
      setTrainingMessage("Upload a dataset before starting training.");
      return;
    }

    // Validate parameters
    if (params.steps < 50) {
      setTrainingMessage("Training steps must be at least 50.");
      return;
    }

    if (params.batchSize < 1) {
      setTrainingMessage("Batch size must be at least 1.");
      return;
    }

    if (params.learningRate <= 0) {
      setTrainingMessage("Learning rate must be greater than 0.");
      return;
    }

    clearInterval(pollRef.current);
    setTraining(true);
    setTrainingComplete(false);
    setTrainingMessage("");
    setLossHistory([]);  // Clear history for fresh training session
    lastLossRef.current = null;

    try {
      await startTraining(
        model,
        uploadedFile.name,
        params.steps,
        params.epochs,
        params.learningRate,
        params.batchSize
      );
      pollRef.current = setInterval(async () => {
        try {
          const nextStatus = await getTrainingStatus();
          setStatus(nextStatus);
          
          // Only add to loss history if loss value has changed
          if (nextStatus.loss != null && nextStatus.loss !== lastLossRef.current) {
            lastLossRef.current = nextStatus.loss;
            setLossHistory((current) =>
              [...current, { step: current.length + 1, loss: Number(nextStatus.loss.toFixed(4)) }].slice(-20)
            );
          }
          
          if (nextStatus.status === "completed") {
            clearInterval(pollRef.current);
            setTraining(false);
            setTrainingComplete(true);
            setTrainingMessage("Training completed successfully!");
          }
        } catch (error) {
          clearInterval(pollRef.current);
          setTraining(false);
          setTrainingMessage(error?.response?.data?.detail || "Unable to refresh training status.");
        }
      }, 2000);
    } catch (error) {
      setTraining(false);
      setTrainingMessage(error?.response?.data?.detail || "Failed to start training.");
    }
  };

  const handleSaveWorkspace = async () => {
    if (!trainingComplete || !status) {
      setTrainingMessage("Training must be complete before saving.");
      return;
    }

    setSaving(true);
    try {
      await saveWorkspace(
        model,
        uploadedFile.name,
        params.epochs,
        params.steps,
        params.learningRate,
        params.batchSize,
        status.loss || 0
      );
      // Fetch the saved snapshot to display it
      const savedSnapshot = await getWorkspaceSnapshot();
      if (savedSnapshot && savedSnapshot.status !== "empty") {
        setSnapshot(savedSnapshot);
      }
      setTrainingMessage("Workspace saved successfully!");
    } catch (error) {
      setTrainingMessage(error?.response?.data?.detail || "Failed to save workspace.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!trainingComplete) {
      setTrainingMessage("Training must be complete before downloading.");
      return;
    }

    try {
      await downloadModel(model);
    } catch (error) {
      setTrainingMessage(error?.response?.data?.detail || "Failed to download model.");
    }
  };

  const handleReset = () => {
    clearInterval(pollRef.current);
    lastLossRef.current = null;
    setTraining(false);
    setTrainingComplete(false);
    setStatus(null);
    setTrainingMessage("");
    setLossHistory([
      { step: 1, loss: 2.31 },
      { step: 2, loss: 1.97 },
      { step: 3, loss: 1.71 },
      { step: 4, loss: 1.43 },
      { step: 5, loss: 1.26 },
    ]);
  };

  const progress = status?.progress_percent ?? 0;
  const currentEpoch = status?.current_epoch ?? 0;
  const totalEpochs = status?.total_epochs ?? params.epochs;
  const currentLoss = status?.loss != null ? status.loss.toFixed(4) : lossHistory.at(-1)?.loss?.toFixed(4) ?? "--";

  // Format progress text: "Epoch 2/3 • 68%"
  const progressText = `Epoch ${currentEpoch.toFixed(1)}/${totalEpochs} • ${Math.round(progress)}%`;

  // Estimate VRAM based on batch size (simple formula)
  const estimateVRAM = (batchSize) => {
    return ((batchSize * 2.5) + 4).toFixed(1);
  };

  // Update a parameter
  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className={themeClass}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Training Dashboard</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  Professional fine-tuning, cleaner workflow
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500">
                  Configure your model stack, load a dataset, and track LoRA training in a polished studio layout.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                <ShieldCheck size={16} />
                Backend ready
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <FieldLabel>Base model</FieldLabel>
                <Select value={model} onChange={(event) => setModel(event.target.value)}>
                  {BASE_MODELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>

              <div>
                <FieldLabel>Method</FieldLabel>
                <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                  {METHODS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>

              <div>
                <FieldLabel>HuggingFace Token (optional)</FieldLabel>
                <Input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="hf_xxxxxxxxx"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className={`${themeClass} overflow-hidden`}>
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Workspace snapshot</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                {snapshot ? "Saved workspace" : "Current run"}
              </h2>
            </div>
            <div className="grid gap-3">
              {snapshot ? (
                <>
                  <Metric label="Model" value={snapshot?.model || "N/A"} />
                  <Metric label="Dataset" value={snapshot?.dataset || "N/A"} />
                  <Metric label="Epochs" value={snapshot?.epochs || "N/A"} />
                  <Metric label="Batch size" value={snapshot?.batch_size || "N/A"} />
                  <Metric label="Learning rate" value={(snapshot?.learning_rate ?? 0).toFixed(5)} />
                  <Metric label="Final loss" value={(Number(snapshot?.final_loss) || 0).toFixed(4)} tone="positive" />
                </>
              ) : (
                <>
                  <Metric label="Dataset" value={uploadMeta ? uploadMeta.rows : "0"} />
                  <Metric label="Method" value={method} />
                  <Metric label="Training loss" value={currentLoss} tone="positive" />
                </>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className={themeClass}>
          <SectionTitle
            icon={Database}
            title="Dataset"
            subtitle="Search, filter, and upload your training corpus."
          />

          <div className="space-y-4">
            <div>
              <FieldLabel>Search dataset</FieldLabel>
              <div className="relative">
                <FolderSearch
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  value={datasetSearch}
                  onChange={(event) => setDatasetSearch(event.target.value)}
                  placeholder="Search datasets (name or keyword)"
                  className="pl-11"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Dataset type</FieldLabel>
                <Select value={datasetType} onChange={(event) => setDatasetType(event.target.value)}>
                  {DATASET_TYPES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Split</FieldLabel>
                <Select value={datasetSplit} onChange={(event) => setDatasetSplit(event.target.value)}>
                  {SPLITS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? "border-green-500 bg-green-50"
                  : uploadMeta
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {uploadMeta ? (
                  <div className="text-green-600">
                    <Database size={32} />
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Database size={32} />
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">{datasetSummary}</p>
              <p className="mt-1 text-xs text-gray-500">
                Drag and drop a CSV, JSON, or TXT file, or use the upload button below.
              </p>

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploading && (
                <div className="mt-3 text-xs font-medium text-green-600">
                  Uploading dataset...
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <ArrowUpFromLine size={16} />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowPreviewModal(true)}
                disabled={!uploadMeta}
              >
                <Eye size={16} />
                View dataset
              </Button>
            </div>

            {uploadMeta && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
                <p className="font-medium text-green-900">Dataset ready ✓</p>
                <p className="mt-1 text-xs text-green-700">
                  {uploadMeta.file_name} • {uploadMeta.rows} rows •{" "}
                  {(uploadMeta.size_bytes / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

          </div>
        </Card>

        <Card className={themeClass}>
          <SectionTitle
            icon={Settings2}
            title="Parameters"
            subtitle="Tune the core training knobs for your run."
          />

          <div className="space-y-6">
            <SliderField
              label="Training steps"
              min="50"
              max="2000"
              step="50"
              value={params.steps}
              onChange={(value) => updateParam("steps", parseInt(value))}
              hint="Controls how many optimizer updates this run will use."
            />

            <div>
              <FieldLabel>Epochs</FieldLabel>
              <Input
                type="number"
                min="1"
                max="100"
                value={params.epochs}
                onChange={(event) => updateParam("epochs", parseInt(event.target.value) || 1)}
              />
              <FieldHint>Number of complete passes through the training dataset.</FieldHint>
            </div>

            <div>
              <FieldLabel>Learning rate</FieldLabel>
              <Input
                type="number"
                step="0.00001"
                min="0"
                value={params.learningRate}
                onChange={(event) => updateParam("learningRate", parseFloat(event.target.value) || 0.0002)}
              />
              <FieldHint>Recommended starting point for LoRA: 0.0002 to 0.0005.</FieldHint>
            </div>

            <div>
              <FieldLabel>Batch size</FieldLabel>
              <Input
                type="number"
                min="1"
                max="32"
                value={params.batchSize}
                onChange={(event) => updateParam("batchSize", parseInt(event.target.value) || 1)}
              />
              <FieldHint>Samples processed per optimization step. Higher = faster but more memory.</FieldHint>
            </div>

            <div className="grid gap-3">
              <Metric label="Estimated VRAM" value={`${estimateVRAM(params.batchSize)} GB`} tone="warning" />
            </div>
          </div>
        </Card>

        <Card className={themeClass}>
          <SectionTitle
            icon={ChartSpline}
            title="Training"
            subtitle="Monitor progress, loss, and job controls."
          />

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Training loss</p>
                  <p className="text-lg font-semibold text-gray-900">{currentLoss}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm">
                  {training ? "Running" : "Idle"}
                </div>
              </div>
              <div className="h-40 w-full min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                  <LineChart data={lossHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="step" stroke="#d1d5db" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#d1d5db" style={{ fontSize: "12px" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="loss"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="flex h-full items-center justify-center rounded-full bg-green-500 text-xs font-semibold text-white transition-all duration-300"
                  style={{ width: `${Math.min(100, progress)}%` }}
                >
                  {progress > 10 && <span>{progressText}</span>}
                </div>
              </div>
              {progress <= 10 && (
                <p className="mt-2 text-xs font-medium text-gray-600">{progressText}</p>
              )}
            </div>

            {trainingMessage && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {trainingMessage}
              </div>
            )}

            <Button
              className="w-full"
              disabled={training || uploading || !uploadMeta}
              onClick={handleStartTraining}
            >
              <Play size={16} />
              {training ? "Training in progress..." : "Start Training"}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                disabled={!trainingComplete || saving}
                onClick={handleSaveWorkspace}
              >
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Check size={16} />}
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="secondary"
                disabled={!trainingComplete}
                onClick={handleDownloadModel}
              >
                <Download size={16} />
                Download
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              disabled={!trainingComplete}
              onClick={() => onOpenChat?.()}
            >
              <MessageSquare size={16} />
              Chat with fine-tuned model
            </Button>

            <Button variant="secondary" className="w-full" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </Button>
          </div>
        </Card>
      </section>

      <DatasetPreviewModal
        fileName={uploadMeta?.file_name}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  );
}

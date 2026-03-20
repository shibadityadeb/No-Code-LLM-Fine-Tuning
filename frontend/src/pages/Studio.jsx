import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpFromLine,
  ChartSpline,
  Database,
  FolderSearch,
  Play,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Input, { FieldHint, FieldLabel, Select } from "../components/Input.jsx";
import { uploadDataset, startTraining, getTrainingStatus } from "../services/api.js";

const LOCAL_MODELS = ["Local GPU", "Cloud Runner", "MacBook Pro", "A100 Pool"];
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

export default function Studio({ darkMode = false }) {
  const [runtime, setRuntime] = useState(LOCAL_MODELS[0]);
  const [model, setModel] = useState(BASE_MODELS[0]);
  const [method, setMethod] = useState(METHODS[0]);
  const [token, setToken] = useState("");

  const [datasetSearch, setDatasetSearch] = useState("alpaca");
  const [datasetType, setDatasetType] = useState(DATASET_TYPES[0]);
  const [datasetSplit, setDatasetSplit] = useState(SPLITS[0]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const [steps, setSteps] = useState("800");
  const [contextLength, setContextLength] = useState("2048");
  const [learningRate, setLearningRate] = useState("0.0002");

  const [status, setStatus] = useState(null);
  const [lossHistory, setLossHistory] = useState([
    { step: 1, loss: 2.31 },
    { step: 2, loss: 1.97 },
    { step: 3, loss: 1.71 },
    { step: 4, loss: 1.43 },
    { step: 5, loss: 1.26 },
  ]);
  const [training, setTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState("");
  const pollRef = useRef(null);

  const themeClass = darkMode
    ? "bg-white/95"
    : "bg-white";

  const datasetSummary = useMemo(() => {
    if (!uploadMeta) {
      return "No dataset uploaded yet";
    }

    return `${uploadMeta.file_name} • ${uploadMeta.rows} rows`;
  }, [uploadMeta]);

  useEffect(() => () => clearInterval(pollRef.current), []);

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

  const handleStartTraining = async () => {
    if (!uploadedFile) {
      setTrainingMessage("Upload a dataset before starting training.");
      return;
    }

    clearInterval(pollRef.current);
    setTraining(true);
    setTrainingMessage("");

    try {
      await startTraining(model, uploadedFile.name);
      pollRef.current = setInterval(async () => {
        try {
          const nextStatus = await getTrainingStatus();
          setStatus(nextStatus);
          if (nextStatus.loss != null) {
            setLossHistory((current) =>
              [...current, { step: current.length + 1, loss: Number(nextStatus.loss.toFixed(4)) }].slice(-12),
            );
          }
          if (!nextStatus.running || nextStatus.progress >= 100) {
            clearInterval(pollRef.current);
            setTraining(false);
            setTrainingMessage("Training finished successfully.");
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

  const handleReset = () => {
    clearInterval(pollRef.current);
    setTraining(false);
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

  const progress = status?.progress ?? 68;
  const currentLoss = status?.loss != null ? status.loss.toFixed(4) : lossHistory.at(-1)?.loss?.toFixed(4) ?? "--";

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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <FieldLabel>Local model</FieldLabel>
                <Select value={runtime} onChange={(event) => setRuntime(event.target.value)}>
                  {LOCAL_MODELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>

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
                <FieldLabel>Token</FieldLabel>
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
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Current run</h2>
            </div>
            <div className="grid gap-3">
              <Metric label="Dataset" value={uploadMeta ? uploadMeta.rows : "0"} />
              <Metric label="Method" value={method} />
              <Metric label="Training loss" value={currentLoss} tone="positive" />
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
                  placeholder="Search Hugging Face datasets"
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

            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <p className="text-sm font-medium text-gray-900">{datasetSummary}</p>
              <p className="mt-1 text-sm text-gray-500">
                Drag and drop a CSV, JSON, or TXT file, or use the upload button below.
              </p>
              {uploadError && <p className="mt-3 text-sm text-red-500">{uploadError}</p>}
              {uploading && <p className="mt-3 text-sm text-green-600">Uploading dataset...</p>}
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
              >
                <ArrowUpFromLine size={16} />
                Upload
              </Button>
              <Button variant="secondary" className="flex-1">
                View dataset
              </Button>
            </div>

            {uploadMeta && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {uploadMeta.file_name} • {uploadMeta.rows} rows •{" "}
                {(uploadMeta.size_bytes / 1024).toFixed(1)} KB
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
              min="100"
              max="3000"
              step="50"
              value={steps}
              onChange={setSteps}
              hint="Controls how many optimizer updates this run will use."
            />

            <SliderField
              label="Context length"
              min="512"
              max="4096"
              step="256"
              value={contextLength}
              onChange={setContextLength}
              hint="Longer context improves multi-turn tasks but increases memory usage."
            />

            <div>
              <FieldLabel>Learning rate</FieldLabel>
              <Input
                type="number"
                step="0.0001"
                value={learningRate}
                onChange={(event) => setLearningRate(event.target.value)}
              />
              <FieldHint>Recommended starting point for LoRA on instruction datasets.</FieldHint>
            </div>

            <div className="grid gap-3">
              <Metric label="Batch size" value="4" />
              <Metric label="Estimated VRAM" value="14.2 GB" tone="warning" />
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
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossHistory}>
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
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-gray-900">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {trainingMessage && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {trainingMessage}
              </div>
            )}

            <Button
              className="w-full"
              disabled={training || uploading}
              onClick={handleStartTraining}
            >
              <Play size={16} />
              Start Training
            </Button>

            <div className="grid grid-cols-3 gap-3">
              <Button variant="secondary">
                <ArrowUpFromLine size={16} />
                Upload
              </Button>
              <Button variant="secondary">
                <Save size={16} />
                Save
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                <RotateCcw size={16} />
                Reset
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 60000,
});

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/upload-dataset", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function startTraining(modelName, datasetFile) {
  const res = await api.post("/start-training", {
    model_name: modelName,
    dataset_file: datasetFile,
  });
  return res.data;
}

export async function getTrainingStatus() {
  const res = await api.get("/training-status");
  return res.data;
}

export async function sendMessage(modelName, userMessage) {
  const res = await api.post("/chat", {
    model_name: modelName,
    user_message: userMessage,
  });
  return res.data;
}

export async function downloadModel(modelName) {
  const res = await api.get(`/download-model/${encodeURIComponent(modelName)}`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", `${modelName}_adapter.zip`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

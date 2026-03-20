import axios from "axios";

// Base API client for backend communication.
// Note: backend runs on port 8000; frontend runs on 5174/5175.
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 60000,
});

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload-dataset", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function startTraining(modelName, datasetFile) {
  const response = await api.post("/start-training", {
    model_name: modelName,
    dataset_file: datasetFile,
  });
  return response.data;
}

export async function getTrainingStatus() {
  const response = await api.get("/training-status");
  return response.data;
}

export async function sendMessage(modelName, userMessage) {
  const response = await api.post("/chat", {
    model_name: modelName,
    user_message: userMessage,
  });
  return response.data;
}

export async function downloadModel(modelName) {
  const response = await api.get(`/download-model/${encodeURIComponent(modelName)}`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${modelName}_adapter.zip`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function compareModels(userMessage, models) {
  const response = await api.post("/compare-models", {
    user_message: userMessage,
    models,
  });
  return response.data;
}

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

export async function viewDataset(fileName) {
  const res = await api.get(`/view-dataset/${encodeURIComponent(fileName)}`);
  return res.data;
}

export async function startTraining(modelName, datasetFile, steps, epochs, learningRate, batchSize) {
  const res = await api.post("/start-training", {
    model_name: modelName,
    dataset_file: datasetFile,
    steps,
    epochs,
    learning_rate: learningRate,
    batch_size: batchSize,
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

export async function saveWorkspace(modelName, datasetName, epochs, steps, learningRate, batchSize, finalLoss) {
  const res = await api.post("/save-workspace", {
    model_name: modelName,
    dataset_name: datasetName,
    epochs,
    steps,
    learning_rate: learningRate,
    batch_size: batchSize,
    final_loss: finalLoss,
  });
  return res.data;
}

export async function getWorkspaceSnapshot() {
  const res = await api.get("/get-workspace-snapshot");
  return res.data;
}

export async function compareModels(userMessage, models) {
  const response = await api.post("/compare-models", {
    user_message: userMessage,
    models,
  });
  return response.data;
}

import axios from "axios";

// Basic API client for talking to the backend.
const api = axios.create({
  baseURL: "/api",
  timeout: 30_000,
});

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function startTraining() {
  return api.post("/train");
}

export async function sendChatMessage(message) {
  const response = await api.post("/chat", { prompt: message });
  return response.data;
}

export async function downloadAdapter() {
  // This will trigger the browser to download the adapter.
  const response = await api.get("/download", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "adapter.zip");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

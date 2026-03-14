# llm-finetune-studio

A web platform for uploading datasets, fine-tuning a small open-source LLM using LoRA, testing it via a chat UI, and downloading the trained adapter.

## ✅ Features

- Upload datasets (CSV/JSON/TXT)
- Fine-tune models with LoRA
- Chat interface for testing the fine-tuned model
- Download trained adapter files

## 🚀 Getting Started

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📁 Structure

- `backend/` - FastAPI server + training routes
- `frontend/` - Vite + React UI
- `datasets/` - Uploaded datasets
- `adapters/` - Trained LoRA adapter files
- `logs/` - Training logs

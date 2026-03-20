# llm-finetune-studio

LLM Fine-tune Studio is a web app for uploading datasets, running LoRA fine-tuning, testing via chat, and downloading trained adapter artifacts.

## Features

- Upload datasets (CSV/JSON/TXT)
- LoRA fine-tuning with progress tracking
- Chat interface to test the tuned adapter
- Download adapter bundle
- Workspace snapshot save/load

## Architecture

- **Backend:** FastAPI + Transformers/PEFT
- **Frontend:** React + Vite + Tailwind
- **Artifacts:** datasets/, adapters/, logs/

## Requirements

- Python 3.10+
- Node.js 18+

GPU is optional. If CUDA is not available, training falls back to CPU and may be slow.

## Quick Start (Dev)

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Open http://localhost:5174

## Production Run

### Backend

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 5174
```

## Configuration

Environment variables are defined in [backend/config.py](backend/config.py):

- `BACKEND_HOST` (default: 0.0.0.0)
- `BACKEND_PORT` (default: 8000)
- `DATASETS_DIR` (default: ../datasets)
- `ADAPTERS_DIR` (default: ../adapters)

## Dataset Rules

- Supported formats: CSV, JSON, TXT
- Size limit: 2 MB
- Row limit: 500

For instruction-style training, include `instruction/prompt` and `response/output` fields. If absent, training falls back to raw text lines.

## API Endpoints (Backend)

- `POST /api/upload-dataset` (multipart file)
- `GET /api/view-dataset/{file_name}`
- `POST /api/start-training`
- `GET /api/training-status`
- `POST /api/save-workspace`
- `GET /api/get-workspace-snapshot`
- `GET /api/download-model/{model_name}`
- `POST /api/chat`

## Output Artifacts

- `adapters/<model>_adapter/`
	- `adapter_model.safetensors` or `adapter_model.bin`
	- `adapter_config.json`
	- tokenizer files
- `logs/training.log`
- `logs/workspace_snapshot.json`

## Production Notes

- CORS is currently configured for local dev only (localhost). For deployment, update allowed origins in [backend/main.py](backend/main.py).
- There is no auth layer; add auth before exposing publicly.
- CPU training is supported but slow.

## Repo Structure

- `backend/` FastAPI app and training pipeline
- `frontend/` React UI
- `datasets/` uploaded datasets
- `adapters/` saved adapters
- `logs/` training logs and snapshots

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

import os
from pathlib import Path

from backend.routes.upload import UPLOADED_DATASETS
from backend.services.training_pipeline import start_training
from backend.utils.status_store import read_status

router = APIRouter()


class TrainingRequest(BaseModel):
    model_name: str
    dataset_file: str
    steps: int = 800
    epochs: int = 3
    learning_rate: float = 0.0002
    batch_size: int = 4


class TrainingStatusResponse(BaseModel):
    current_epoch: float | None
    total_epochs: int | None
    progress_percent: float
    loss: float | None
    status: str


def _start_training_job(request: TrainingRequest, dataset_bytes: bytes | None) -> None:
    start_training(
        request.model_name,
        request.dataset_file,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        steps=request.steps,
        dataset_bytes=dataset_bytes,
    )


@router.post("/start-training")
async def start_training_endpoint(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start a LoRA fine-tuning job with specified parameters."""

    dataset_bytes = UPLOADED_DATASETS.get(request.dataset_file)

    if dataset_bytes is None:
        datasets_dir = Path(__file__).resolve().parents[2] / "datasets"
        dataset_path = datasets_dir / request.dataset_file
        if not dataset_path.exists():
            raise HTTPException(
                status_code=400,
                detail=f"Dataset '{request.dataset_file}' not found. Upload dataset first.",
            )

    # Validate parameters
    if request.steps < 50:
        raise HTTPException(status_code=400, detail="Steps must be at least 50.")

    if request.epochs < 1:
        raise HTTPException(status_code=400, detail="Epochs must be at least 1.")

    if request.learning_rate <= 0:
        raise HTTPException(status_code=400, detail="Learning rate must be greater than 0.")

    if request.batch_size < 1:
        raise HTTPException(status_code=400, detail="Batch size must be at least 1.")

    try:
        background_tasks.add_task(_start_training_job, request, dataset_bytes)
        return {"status": "started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/training-status")
def training_status() -> TrainingStatusResponse:
    """Get the most recent training status without crashing on missing/corrupt files."""
    return TrainingStatusResponse(**read_status())


@router.get("/debug-status")
def debug_status() -> dict[str, bool]:
    return {
        "logs_exists": os.path.exists("logs"),
        "file_exists": os.path.exists("logs/training_status.json"),
    }

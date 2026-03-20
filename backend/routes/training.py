from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from pathlib import Path

from backend.routes.upload import UPLOADED_DATASETS
from backend.services.training_pipeline import get_training_status, start_training, TRAINING_STATUS
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
    status: str  # "running" or "completed"


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
    """Get the most recent training status (epoch, loss, progress)."""
    try:
        persisted = read_status()
        raw_status = {
            "epoch": persisted.get("current_epoch"),
            "total_epochs": persisted.get("total_epochs"),
            "loss": persisted.get("loss"),
            "progress": persisted.get("progress_percent"),
            "running": persisted.get("status") == "running",
        }
    except Exception:
        try:
            raw_status = get_training_status()
        except Exception:
            raw_status = {
                "epoch": TRAINING_STATUS.get("epoch"),
                "total_epochs": TRAINING_STATUS.get("total_epochs"),
                "loss": TRAINING_STATUS.get("loss"),
                "progress": TRAINING_STATUS.get("progress"),
                "running": TRAINING_STATUS.get("running", False),
            }
    # Ensure progress_percent is always a valid number (not None)
    progress = raw_status.get("progress") or 0
    if progress is None:
        progress = 0
    return TrainingStatusResponse(
        current_epoch=raw_status.get("epoch"),
        total_epochs=raw_status.get("total_epochs"),
        progress_percent=float(progress),
        loss=raw_status.get("loss"),
        status="running" if raw_status.get("running") else "completed",
    )

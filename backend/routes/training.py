from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.routes.upload import UPLOADED_DATASETS
from backend.services.training_pipeline import get_training_status, start_training

router = APIRouter()


class TrainingRequest(BaseModel):
    model_name: str
    dataset_file: str


@router.post("/start-training")
def start_training_endpoint(request: TrainingRequest):
    """Start a LoRA fine-tuning job."""

    dataset_bytes = UPLOADED_DATASETS.get(request.dataset_file)

    if dataset_bytes is None:
        # Dataset not found in memory; user can pass a dataset filename existing in data folder.
        # For non-saved mode, we require upload first.
        raise HTTPException(
            status_code=400,
            detail=f"Dataset '{request.dataset_file}' not found in uploaded datasets. Upload dataset first.",
        )

    try:
        job_id = start_training(
            request.model_name,
            request.dataset_file,
            dataset_bytes=dataset_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "started", "job_id": job_id}


@router.get("/training-status")
def training_status():
    """Get the most recent training status (epoch, loss, progress)."""
    return get_training_status()

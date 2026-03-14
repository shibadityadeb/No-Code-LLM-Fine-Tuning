from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.training_pipeline import get_training_status, start_training

router = APIRouter()


class TrainingRequest(BaseModel):
    model_name: str
    dataset_file: str


@router.post("/start-training")
def start_training_endpoint(request: TrainingRequest):
    """Start a LoRA fine-tuning job."""

    try:
        job_id = start_training(request.model_name, request.dataset_file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "started", "job_id": job_id}


@router.get("/training-status")
def training_status():
    """Get the most recent training status (epoch, loss, progress)."""
    return get_training_status()

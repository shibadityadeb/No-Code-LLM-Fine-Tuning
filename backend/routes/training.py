from fastapi import APIRouter

from backend.services.training_pipeline import start_training

router = APIRouter()

@router.post("/train")
def train_model():
    """Start a LoRA fine-tuning job."""
    # TODO: validate dataset availability, model selection, etc.
    job = start_training()
    return {"status": "started", "job": job}

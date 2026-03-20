from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from backend.services.inference_service import generate_response

router = APIRouter()


class ChatRequest(BaseModel):
    model_name: str
    user_message: str


class CompareRequest(BaseModel):
    user_message: str
    models: List[str] = ["TinyLlama", "Phi-2", "DistilGPT2"]


@router.post("/chat")
def chat(request: ChatRequest):
    """Generate a response from the fine-tuned model."""
    try:
        response = generate_response(request.model_name, request.user_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"response": response}


@router.post("/compare-models")
def compare_models(request: CompareRequest):
    """Compare multiple models on one user prompt for side-by-side evaluation."""
    responses: Dict[str, str] = {}
    for model_name in request.models:
        try:
            responses[model_name] = generate_response(model_name, request.user_message)
        except Exception as e:
            responses[model_name] = f"Error while generating: {str(e)}"
    return responses

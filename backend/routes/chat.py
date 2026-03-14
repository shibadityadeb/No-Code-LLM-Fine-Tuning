from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.inference_service import generate_response

router = APIRouter()


class ChatRequest(BaseModel):
    model_name: str
    user_message: str


@router.post("/chat")
def chat(request: ChatRequest):
    """Generate a response from the fine-tuned model."""
    try:
        response = generate_response(request.model_name, request.user_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"response": response}

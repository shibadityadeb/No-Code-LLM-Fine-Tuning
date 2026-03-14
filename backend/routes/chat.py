from fastapi import APIRouter

from backend.services.inference_service import generate_response

router = APIRouter()

@router.post("/chat")
def chat(prompt: str):
    """Generate a response from the fine-tuned model."""
    # TODO: wire this into the real inference pipeline
    response = generate_response(prompt)
    return {"response": response}

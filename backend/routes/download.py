from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/download")
def download_adapter():
    """Download the latest trained LoRA adapter as a zip file."""
    # TODO: create or stream the adapter zip from adapters/
    dummy_content = b"placeholder adapter content"
    return Response(content=dummy_content, media_type="application/octet-stream")

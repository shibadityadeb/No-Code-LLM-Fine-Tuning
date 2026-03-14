from fastapi import APIRouter, File, UploadFile

router = APIRouter()

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Endpoint to upload a dataset file."""
    # TODO: add validation and persistence (save to datasets/)
    contents = await file.read()
    return {"filename": file.filename, "size": len(contents)}

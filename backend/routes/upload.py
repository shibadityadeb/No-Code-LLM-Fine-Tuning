import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.services.dataset_validator import (
    DatasetValidationError,
    validate_dataset_bytes,
)

router = APIRouter()

# In-memory dataset cache: no permanent dataset save on disk.
UPLOADED_DATASETS = {}


@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file for training.

    Accepts CSV, JSON or TXT files. Performs size and row validation.
    """

    filename = os.path.basename(file.filename)
    contents = await file.read()

    try:
        metadata = validate_dataset_bytes(filename, contents)
    except DatasetValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Keep dataset content in-memory; do not persist to disk.
    UPLOADED_DATASETS[filename] = contents

    return {
        "file_name": filename,
        "rows": metadata["rows"],
        "size_bytes": metadata["size_bytes"],
    }

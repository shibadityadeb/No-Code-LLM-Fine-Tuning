import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.services.dataset_validator import DatasetValidationError, validate_dataset

router = APIRouter()

DATASETS_DIR = Path(__file__).resolve().parents[2] / "datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file for training.

    Accepts CSV, JSON or TXT files. Performs size and row validation.
    """

    filename = os.path.basename(file.filename)
    file_path = DATASETS_DIR / filename

    # Save upload to disk first so we can validate it.
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        metadata = validate_dataset(str(file_path))
    except DatasetValidationError as e:
        # Remove invalid file so we don't keep bad data around
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "file_name": filename,
        "rows": metadata["rows"],
        "size_bytes": metadata["size_bytes"],
    }

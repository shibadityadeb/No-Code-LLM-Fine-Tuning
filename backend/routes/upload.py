import csv
import io
import json
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.services.dataset_validator import DatasetValidationError, validate_dataset_bytes

router = APIRouter()

# In-memory dataset cache: no permanent dataset save on disk.
UPLOADED_DATASETS = {}

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASETS_DIR = ROOT_DIR / "datasets"


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

    # Persist to disk so training can resume even after a backend restart.
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    disk_path = DATASETS_DIR / filename
    with open(disk_path, "wb") as f:
        f.write(contents)

    # Keep dataset content in-memory for fast access.
    UPLOADED_DATASETS[filename] = contents

    return {
        "file_name": filename,
        "rows": metadata["rows"],
        "size_bytes": metadata["size_bytes"],
    }


@router.get("/view-dataset/{file_name}")
def view_dataset(file_name: str):
    """Retrieve preview of uploaded dataset (first 10 rows).
    
    Returns structured data with headers and rows.
    """
    
    if file_name not in UPLOADED_DATASETS:
        raise HTTPException(status_code=404, detail=f"Dataset '{file_name}' not found")
    
    contents = UPLOADED_DATASETS[file_name]
    ext = Path(file_name).suffix.lower()
    
    try:
        # Parse based on file type
        if ext == ".csv":
            rows = _parse_csv_preview(contents, max_rows=10)
        elif ext == ".json":
            rows = _parse_json_preview(contents, max_rows=10)
        elif ext == ".txt":
            rows = _parse_txt_preview(contents, max_rows=10)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        
        # Extract column headers from first row if available
        columns = list(rows[0].keys()) if rows else []
        
        return {
            "file_name": file_name,
            "columns": columns,
            "preview_rows": rows,
            "total_rows": len(rows),
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing dataset: {str(e)}")


def _parse_csv_preview(contents: bytes, max_rows: int = 10) -> list:
    """Parse CSV and return first N rows as list of dicts."""
    
    rows = []
    text = contents.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    
    for idx, row in enumerate(reader):
        if idx >= max_rows:
            break
        rows.append(dict(row))
    
    return rows


def _parse_json_preview(contents: bytes, max_rows: int = 10) -> list:
    """Parse JSON and return first N rows as list of dicts."""
    
    text = contents.decode("utf-8", errors="ignore")
    data = json.loads(text)
    
    rows = []
    
    if isinstance(data, list):
        for idx, item in enumerate(data):
            if idx >= max_rows:
                break
            if isinstance(item, dict):
                rows.append(item)
            else:
                rows.append({"value": str(item)})
    elif isinstance(data, dict):
        rows.append(data)
    
    return rows


def _parse_txt_preview(contents: bytes, max_rows: int = 10) -> list:
    """Parse TXT and return first N rows as list of dicts."""
    
    rows = []
    text = contents.decode("utf-8", errors="ignore")
    
    for idx, line in enumerate(text.split("\n")):
        if idx >= max_rows:
            break
        line = line.strip()
        if not line:
            continue
        rows.append({"content": line})
    
    return rows

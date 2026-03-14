import csv
import json
import os
from pathlib import Path

# Limits for uploaded datasets.
MAX_DATASET_ROWS = 500
MAX_DATASET_BYTES = 2 * 1024 * 1024  # 2MB
ALLOWED_EXTENSIONS = {".csv", ".json", ".txt"}


class DatasetValidationError(ValueError):
    """Raised when a dataset fails validation."""


def _count_rows_csv(file_path: str) -> int:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        # Count all rows including header (if present)
        return sum(1 for _ in reader)


def _count_rows_json(file_path: str) -> int:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        data = json.load(f)

    if isinstance(data, list):
        return len(data)

    # Treat a single JSON object as one row
    return 1


def _count_rows_txt(file_path: str) -> int:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return sum(1 for _ in f)


def validate_dataset(file_path: str) -> dict:
    """Validate the dataset file for size, type and row count.

    Returns a dict with metadata (rows, size_bytes) if valid.
    Raises DatasetValidationError otherwise.
    """

    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise DatasetValidationError("Dataset file does not exist")

    ext = path.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise DatasetValidationError(
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    size_bytes = path.stat().st_size
    if size_bytes > MAX_DATASET_BYTES:
        raise DatasetValidationError(
            f"Dataset too large ({size_bytes} bytes). Maximum is {MAX_DATASET_BYTES} bytes."
        )

    if ext == ".csv":
        rows = _count_rows_csv(file_path)
    elif ext == ".json":
        rows = _count_rows_json(file_path)
    else:
        rows = _count_rows_txt(file_path)

    if rows > MAX_DATASET_ROWS:
        raise DatasetValidationError(
            f"Dataset has too many rows ({rows}). Maximum is {MAX_DATASET_ROWS} rows."
        )

    return {"rows": rows, "size_bytes": size_bytes}

import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

ROOT_DIR = Path(__file__).resolve().parents[2]
ADAPTERS_DIR = ROOT_DIR / "adapters"


@router.get("/download-model/{model_name}")
def download_adapter(model_name: str):
    """Return a zip of the trained adapter for the given model name."""

    adapter_dir = ADAPTERS_DIR / f"{model_name}_adapter"
    if not adapter_dir.exists() or not adapter_dir.is_dir():
        raise HTTPException(status_code=404, detail="Adapter not found")

    zip_path = adapter_dir.with_suffix(".zip")
    # Create a fresh zip every time so users get the latest weights.
    shutil.make_archive(str(adapter_dir), "zip", root_dir=str(adapter_dir))

    return FileResponse(
        path=str(zip_path),
        filename=f"{model_name}_adapter.zip",
        media_type="application/zip",
    )

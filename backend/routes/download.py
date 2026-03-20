import json
import zipfile
from pathlib import Path
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

ROOT_DIR = Path(__file__).resolve().parents[2]
ADAPTERS_DIR = ROOT_DIR / "adapters"
LOGS_DIR = ROOT_DIR / "logs"


@router.get("/download-model/{model_name}")
def download_adapter(model_name: str):
    """Return a zip of the trained adapter (PEFT weights only, not base model)."""

    adapter_dir = ADAPTERS_DIR / f"{model_name}_adapter"
    if not adapter_dir.exists() or not adapter_dir.is_dir():
        raise HTTPException(status_code=404, detail="Adapter not found. Train the model first.")

    # Verify adapter files exist (support safetensors or bin).
    adapter_config = adapter_dir / "adapter_config.json"
    adapter_model_bin = adapter_dir / "adapter_model.bin"
    adapter_model_safe = adapter_dir / "adapter_model.safetensors"
    if not adapter_config.exists() or (not adapter_model_bin.exists() and not adapter_model_safe.exists()):
        raise HTTPException(
            status_code=404,
            detail="Adapter files incomplete. Training may not have completed successfully.",
        )

    zip_path = adapter_dir.with_suffix(".zip")
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
        for file_path in sorted(adapter_dir.rglob("*")):
            if file_path.is_file():
                zipf.write(file_path, arcname=file_path.relative_to(adapter_dir))

    return FileResponse(
        path=str(zip_path),
        filename="fine_tuned_model.zip",
        media_type="application/zip",
    )


class SaveWorkspaceRequest(BaseModel):
    model_name: str
    dataset_name: str
    epochs: int
    steps: int
    learning_rate: float
    batch_size: int
    final_loss: float


@router.post("/save-workspace")
def save_workspace(request: SaveWorkspaceRequest):
    """Save training workspace snapshot including config and results."""

    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    snapshot = {
        "model": request.model_name,
        "dataset": request.dataset_name,
        "epochs": request.epochs,
        "steps": request.steps,
        "learning_rate": request.learning_rate,
        "batch_size": request.batch_size,
        "final_loss": request.final_loss,
        "status": "completed",
    }

    workspace_file = LOGS_DIR / "workspace_snapshot.json"
    with open(workspace_file, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)

    return {"status": "saved", "file": str(workspace_file)}


@router.get("/get-workspace-snapshot")
def get_workspace_snapshot():
    """Retrieve the saved workspace snapshot."""
    workspace_file = LOGS_DIR / "workspace_snapshot.json"

    if not workspace_file.exists():
        return {"status": "empty"}

    with open(workspace_file, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    return snapshot

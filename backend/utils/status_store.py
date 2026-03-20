import json
from pathlib import Path
from typing import Any, Dict

ROOT_DIR = Path(__file__).resolve().parents[2]
LOGS_DIR = ROOT_DIR / "logs"
STATUS_FILE = LOGS_DIR / "training_status.json"


DEFAULT_STATUS: Dict[str, Any] = {
    "current_epoch": 0,
    "total_epochs": 3,
    "progress_percent": 0,
    "loss": 0,
    "status": "idle",
}


def ensure_status_file() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    if not STATUS_FILE.exists():
        write_status(DEFAULT_STATUS)


def read_status() -> Dict[str, Any]:
    ensure_status_file()
    with open(STATUS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_status(data: Dict[str, Any]) -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)

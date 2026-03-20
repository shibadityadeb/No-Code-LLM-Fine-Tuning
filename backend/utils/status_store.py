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


def init_status_file() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    if not STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_STATUS, f)
        except Exception:
            pass


def ensure_status_file() -> None:
    init_status_file()


def read_status() -> Dict[str, Any]:
    init_status_file()
    try:
        with open(STATUS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return {**DEFAULT_STATUS, **data}
    except Exception:
        pass
    return DEFAULT_STATUS.copy()


def write_status(data: Dict[str, Any]) -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {**DEFAULT_STATUS, **data}
    try:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f)
    except Exception as exc:
        print(f"Error writing status: {exc}")

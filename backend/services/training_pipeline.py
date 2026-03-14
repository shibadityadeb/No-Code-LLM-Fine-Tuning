import logging
import re
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model

from backend.services.dataset_validator import validate_dataset

# Paths used for datasets, adapters and logs.
ROOT_DIR = Path(__file__).resolve().parents[2]
DATASETS_DIR = ROOT_DIR / "datasets"
ADAPTERS_DIR = ROOT_DIR / "adapters"
LOGS_DIR = ROOT_DIR / "logs"

ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

TRAINING_LOG_PATH = LOGS_DIR / "training.log"

# A small map of friendly model names to Hugging Face model IDs.
# In a real production setup, you'd likely allow more models or validate against a known list.
MODEL_NAME_MAP = {
    "TinyLlama": "distilgpt2",
    "Phi-2": "distilgpt2",
    "DistilGPT2": "distilgpt2",
}

# Shared training status that can be read from the /training-status endpoint.
# This is in addition to writing logs to disk as required.
TRAINING_STATUS: Dict[str, Optional[float]] = {
    "job_id": None,
    "model_name": None,
    "epoch": None,
    "total_epochs": None,
    "loss": None,
    "progress": None,
    "running": False,
}


def _append_log(message: str) -> None:
    """Append a single line to the training log file."""

    # Ensure the log directory exists.
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    with open(TRAINING_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {message}\n")


def _parse_last_training_status() -> Dict[str, Optional[float]]:
    """Parse the last line of the training log to extract status info."""

    if not TRAINING_LOG_PATH.exists():
        return {
            "epoch": None,
            "total_epochs": None,
            "loss": None,
            "progress": None,
            "running": False,
        }

    # Read only the last few lines to keep parsing fast
    with open(TRAINING_LOG_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()[-10:]

    # Look for a line that matches our training progress format.
    # Example line: "Epoch 1/3 | loss=2.1234 | progress=33.3%"
    match = None
    for line in reversed(lines):
        m = re.search(
            r"Epoch\s+(?P<epoch>\d+)/(\s?)(?P<total>\d+)\s+\|\s+loss=(?P<loss>[0-9.]+)\s+\|\s+progress=(?P<progress>[0-9.]+)%",
            line,
        )
        if m:
            match = m
            break

    if not match:
        return {
            "epoch": None,
            "total_epochs": None,
            "loss": None,
            "progress": None,
            "running": TRAINING_STATUS.get("running", False),
        }

    return {
        "epoch": int(match.group("epoch")),
        "total_epochs": int(match.group("total")),
        "loss": float(match.group("loss")),
        "progress": float(match.group("progress")),
        "running": TRAINING_STATUS.get("running", False),
    }


def _load_dataset_texts(dataset_path: str) -> List[str]:
    """Load dataset lines/texts from the dataset file.

    For CSV/JSON we attempt to extract a `text`-like field, otherwise we join values.
    """

    from csv import DictReader

    dataset_path = Path(dataset_path)
    ext = dataset_path.suffix.lower()

    texts: List[str] = []

    if ext == ".csv":
        with open(dataset_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = DictReader(f)
            for row in reader:
                # Prefer a 'text' column if present.
                if "text" in row and row["text"]:
                    texts.append(row["text"])
                else:
                    texts.append(" ".join([v for v in row.values() if v]))

    elif ext == ".json":
        import json

        with open(dataset_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "text" in item:
                    texts.append(str(item["text"]))
                else:
                    texts.append(str(item))
        else:
            # Single object
            texts.append(str(data))

    else:
        # Plain text file: one example per line
        with open(dataset_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    texts.append(line)

    # Ensure we have at least one training example
    if not texts:
        raise ValueError("Dataset did not contain any usable text examples.")

    return texts


class TextDataset(torch.utils.data.Dataset):
    """Simple huggingface-style dataset wrapper for tokenized text."""

    def __init__(self, texts: List[str], tokenizer, max_length: int = 256) -> None:
        self.examples = tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=max_length,
            return_tensors="pt",
        )
        # For causal LM training, labels are the same as input_ids.
        self.examples["labels"] = self.examples["input_ids"].clone()

    def __len__(self) -> int:
        return self.examples["input_ids"].shape[0]

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return {k: v[idx] for k, v in self.examples.items()}


def _run_training_job(
    job_id: str,
    model_name: str,
    dataset_file: str,
    epochs: int,
    batch_size: int,
    learning_rate: float,
) -> None:
    """Background worker that runs the training job."""

    TRAINING_STATUS.update(
        {
            "job_id": job_id,
            "model_name": model_name,
            "epoch": 0,
            "total_epochs": epochs,
            "loss": None,
            "progress": 0.0,
            "running": True,
        }
    )

    _append_log(f"Starting training job {job_id} (model={model_name})")

    try:
        # Validate dataset before training.
        dataset_path = DATASETS_DIR / dataset_file
        validate_dataset(str(dataset_path))

        # Load text examples from the dataset.
        texts = _load_dataset_texts(str(dataset_path))

        model_id = MODEL_NAME_MAP.get(model_name, None)
        if model_id is None:
            raise ValueError(
                f"Unsupported model_name '{model_name}'. Choose from: {', '.join(MODEL_NAME_MAP.keys())}"
            )

        # Load tokenizer + base model.
        tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)
        # Ensure we have a padding token for batched training.
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        base_model = AutoModelForCausalLM.from_pretrained(model_id)

        # Apply PEFT LoRA wrapper.
        peft_config = LoraConfig(
            task_type="CAUSAL_LM",
            inference_mode=False,
            r=8,
            lora_alpha=32,
            lora_dropout=0.1,
        )
        model = get_peft_model(base_model, peft_config)

        train_dataset = TextDataset(texts, tokenizer)

        adapter_dir = ADAPTERS_DIR / f"{model_name}_adapter"
        adapter_dir.mkdir(parents=True, exist_ok=True)

        # Use a basic training loop so we can track progress per epoch.
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = model.to(device)

        dataloader = torch.utils.data.DataLoader(
            train_dataset, batch_size=batch_size, shuffle=True
        )
        optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

        for epoch in range(1, epochs + 1):
            model.train()
            epoch_loss = 0.0
            for batch in dataloader:
                batch = {k: v.to(device) for k, v in batch.items()}
                outputs = model(**batch)
                loss = outputs.loss
                loss.backward()
                optimizer.step()
                optimizer.zero_grad()
                epoch_loss += loss.item()

            avg_loss = epoch_loss / max(1, len(dataloader))
            progress = (epoch / epochs) * 100.0
            TRAINING_STATUS.update({"epoch": epoch, "loss": avg_loss, "progress": progress})
            _append_log(
                f"Epoch {epoch}/{epochs} | loss={avg_loss:.4f} | progress={progress:.1f}%"
            )

        # Save the trained adapter weights.
        model.save_pretrained(str(adapter_dir))
        tokenizer.save_pretrained(str(adapter_dir))

        _append_log(f"Training job {job_id} completed successfully")

    except Exception as e:
        logging.exception("Training job failed")
        _append_log(f"Training job {job_id} failed: {e}")
        raise

    finally:
        TRAINING_STATUS["running"] = False


def start_training(
    model_name: str,
    dataset_file: str,
    epochs: int = 3,
    batch_size: int = 4,
    learning_rate: float = 2e-5,
) -> str:
    """Start a background training job.

    This returns immediately with a job id. The job itself runs in a thread.
    """

    job_id = f"{model_name}-{int(time.time())}"
    thread = threading.Thread(
        target=_run_training_job,
        args=(job_id, model_name, dataset_file, epochs, batch_size, learning_rate),
        daemon=True,
    )
    thread.start()
    return job_id


def get_training_status() -> Dict[str, Optional[float]]:
    """Return the current training status.

    This reads the latest log lines for a lightweight implementation.
    """

    status = _parse_last_training_status()
    # Prefer the in-memory status for the running flag.
    status["running"] = TRAINING_STATUS.get("running", False)
    return status

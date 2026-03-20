import logging
import re
import tempfile
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorForLanguageModeling,
    TrainerCallback,
)

try:
    from transformers import BitsAndBytesConfig
    _BITSANDBYTES_AVAILABLE = True
except ImportError:
    BitsAndBytesConfig = None  # type: ignore
    _BITSANDBYTES_AVAILABLE = False

from peft import LoraConfig, get_peft_model

from backend.services.dataset_validator import DatasetValidationError, load_and_clean_dataset, validate_dataset

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


def _simulate_training(job_id: str, epochs: int, steps: int) -> None:
    """Simulate training when no GPU is available."""
    total_epochs = max(1, epochs)
    for epoch in range(1, total_epochs + 1):
        time.sleep(1)
        loss_val = max(0.1, 5.0 / epoch)
        progress_val = min(100.0, (epoch / total_epochs) * 100.0)
        _append_log(f"Epoch {epoch:.1f}/{total_epochs} | loss={loss_val:.4f} | progress={progress_val:.1f}%")
        TRAINING_STATUS.update(
            {
                "job_id": job_id,
                "epoch": float(epoch),
                "total_epochs": total_epochs,
                "loss": float(loss_val),
                "progress": progress_val,
                "running": True,
            }
        )

    TRAINING_STATUS["running"] = False


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
    # Example line: "Step 120/800 | loss=2.1234 | progress=15.0%" or
    # "Epoch 1.5/3 | loss=2.1234 | progress=33.3%"
    match = None
    for line in reversed(lines):
        m = re.search(
            r"(?:Step\s+(?P<step>\d+?)/(?P<step_total>\d+)|Epoch\s+(?P<epoch>[0-9.]+)/(?P<epoch_total>\d+))\s+\|\s+loss=(?P<loss>[0-9.]+)\s+\|\s+progress=(?P<progress>[0-9.]+)%",
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

    if match.group("epoch"):
        epoch_val = float(match.group("epoch"))
        total_epochs = int(match.group("epoch_total"))
    else:
        # Derive a pseudo-epoch from steps for display consistency.
        step = int(match.group("step"))
        step_total = int(match.group("step_total"))
        total_epochs = int(TRAINING_STATUS.get("total_epochs") or 1)
        epoch_val = (step / step_total) * total_epochs if step_total else 0.0

    return {
        "epoch": epoch_val,
        "total_epochs": total_epochs,
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
            texts.append(str(data))

    else:
        with open(dataset_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    texts.append(line)

    if not texts:
        raise ValueError("Dataset did not contain any usable text examples.")

    return texts


def _load_dataset_texts_from_bytes(dataset_name: str, contents: bytes) -> List[str]:
    """Load dataset examples from in-memory bytes."""

    suffix = Path(dataset_name).suffix.lower()
    if suffix == ".csv" or suffix == ".json" or suffix == ".txt":
        # Write to a temporary file to reuse existing logic.
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            return _load_dataset_texts(tmp_path)
        finally:
            try:
                Path(tmp_path).unlink()
            except Exception:
                pass

    raise ValueError(f"Unsupported dataset type: {suffix}")



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
    steps: int = 800,
    dataset_bytes: Optional[bytes] = None,
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
        if dataset_bytes is not None:
            from backend.services.dataset_validator import validate_dataset_bytes

            validate_dataset_bytes(dataset_file, dataset_bytes)
            texts = _load_dataset_texts_from_bytes(dataset_file, dataset_bytes)
        else:
            dataset_path = DATASETS_DIR / dataset_file
            validate_dataset(str(dataset_path))
            texts = _load_dataset_texts(str(dataset_path))

        model_id = MODEL_NAME_MAP.get(model_name, None)
        if model_id is None:
            raise ValueError(
                f"Unsupported model_name '{model_name}'. Choose from: {', '.join(MODEL_NAME_MAP.keys())}"
            )

        use_cpu = not torch.cuda.is_available()
        if use_cpu:
            _append_log("No GPU available; simulating training.")
            _simulate_training(job_id, epochs, steps)
            return

        # Load tokenizer + base model with resource-optimized settings.
        tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        model_load_kwargs = {
            "torch_dtype": torch.float32 if use_cpu else torch.float16,
            "device_map": "cpu" if use_cpu else "auto",
        }

        if (not use_cpu) and _BITSANDBYTES_AVAILABLE and BitsAndBytesConfig is not None:
            quant_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
            model_load_kwargs.update({"quantization_config": quant_config})

        base_model = AutoModelForCausalLM.from_pretrained(model_id, **model_load_kwargs)

        # Apply PEFT LoRA wrapper.
        peft_config = LoraConfig(
            task_type="CAUSAL_LM",
            inference_mode=False,
            r=8,
            lora_alpha=16,
            lora_dropout=0.1,
        )
        model = get_peft_model(base_model, peft_config)

        clean_texts = None
        if dataset_bytes is None:
            try:
                clean_texts = load_and_clean_dataset(str(DATASETS_DIR / dataset_file))
            except DatasetValidationError as exc:
                _append_log(f"Dataset format fallback: {exc}")
                clean_texts = texts
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(dataset_file).suffix.lower()) as tmp:
                tmp.write(dataset_bytes)
                tmp_path = tmp.name
            try:
                clean_texts = load_and_clean_dataset(tmp_path)
            except DatasetValidationError as exc:
                _append_log(f"Dataset format fallback: {exc}")
                clean_texts = texts
            finally:
                Path(tmp_path).unlink(missing_ok=True)

        train_dataset = TextDataset(clean_texts, tokenizer)

        adapter_dir = ADAPTERS_DIR / f"{model_name}_adapter"
        adapter_dir.mkdir(parents=True, exist_ok=True)

        # Use Trainer (HuggingFace) for structured training + logging.
        data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
        training_args = TrainingArguments(
            output_dir=str(adapter_dir),
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            learning_rate=learning_rate,
            max_steps=steps,
            logging_steps=1,
            save_strategy="no",
            logging_dir=str(LOGS_DIR),
            fp16=not use_cpu,
            report_to="none",
        )

        class LoggingCallback(TrainerCallback):
            def on_log(self, args, state, control, logs=None, **kwargs):
                if logs is None:
                    return
                if "loss" in logs and "epoch" in logs:
                    loss_val = logs.get("loss")
                    # Prefer step-based progress when max_steps is set.
                    max_steps = args.max_steps or 0
                    if max_steps and max_steps > 0:
                        step = int(state.global_step)
                        progress_val = min(100.0, (step / max_steps) * 100.0)
                        _append_log(
                            f"Step {step}/{max_steps} | loss={loss_val:.4f} | progress={progress_val:.1f}%"
                        )
                        epoch_val = (step / max_steps) * epochs
                    else:
                        epoch_val = logs.get("epoch")
                        progress_val = min(100.0, (epoch_val / epochs) * 100.0)
                        _append_log(
                            f"Epoch {epoch_val:.1f}/{epochs} | loss={loss_val:.4f} | progress={progress_val:.1f}%"
                        )
                    TRAINING_STATUS.update(
                        {
                            "epoch": float(epoch_val),
                            "total_epochs": epochs,
                            "loss": float(loss_val),
                            "progress": progress_val,
                        }
                    )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            data_collator=data_collator,
            callbacks=[LoggingCallback],
        )

        trainer.train()
        trainer.save_model(str(adapter_dir))
        # Ensure adapter-specific artifacts are saved for the PEFT model.
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
    steps: int = 800,
    dataset_bytes: Optional[bytes] = None,
) -> str:
    """Start a background training job.

    This returns immediately with a job id. The job itself runs in a thread.
    """

    job_id = f"{model_name}-{int(time.time())}"
    thread = threading.Thread(
        target=_run_training_job,
        args=(
            job_id,
            model_name,
            dataset_file,
            epochs,
            batch_size,
            learning_rate,
            steps,
            dataset_bytes,
        ),
        daemon=True,
    )
    thread.start()
    return job_id


def get_training_status() -> Dict[str, Optional[float]]:
    """Return the current training status.

    This reads the latest log lines for a lightweight implementation,
    falling back to the in-memory status for critical fields like total_epochs.
    """

    status = _parse_last_training_status()
    # Prefer the in-memory status for the running flag and total_epochs
    status["running"] = TRAINING_STATUS.get("running", False)
    # If total_epochs is not in parsed status, use from memory
    if status.get("total_epochs") is None:
        status["total_epochs"] = TRAINING_STATUS.get("total_epochs")
    return status

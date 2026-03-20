from pathlib import Path
from typing import Dict, Optional

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Cache loaded models/tokenizers to avoid re-loading on every request.
_MODEL_CACHE: Dict[str, Dict[str, object]] = {}

# Map user-facing model names to HF model IDs.
MODEL_NAME_MAP = {
    "TinyLlama": "distilgpt2",
    "Phi-2": "distilgpt2",
    "DistilGPT2": "distilgpt2",
}

ROOT_DIR = Path(__file__).resolve().parents[2]
ADAPTERS_DIR = ROOT_DIR / "adapters"

# message to include when adapter missing/fallback mode.
FALLBACK_WARNING: Optional[str] = None
FALLBACK_RESPONSE = "Model not available. Using base response."


def _load_model_and_tokenizer(model_name: str):
    """Load (or re-use cached) model + tokenizer for a given base model name."""

    if model_name in _MODEL_CACHE:
        return (
            _MODEL_CACHE[model_name]["model"],
            _MODEL_CACHE[model_name]["tokenizer"],
            _MODEL_CACHE[model_name].get("warning"),
        )

    model_id = MODEL_NAME_MAP.get(model_name)
    if model_id is None:
        raise ValueError(f"Unsupported model_name '{model_name}'")

    try:
        print("Chat request received")
        tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        model_kwargs = {"torch_dtype": "auto", "device_map": "auto" if torch.cuda.is_available() else "cpu"}
        try:
            base_model = AutoModelForCausalLM.from_pretrained(model_id, **model_kwargs)
        except Exception:
            base_model = AutoModelForCausalLM.from_pretrained(model_id)
        print("Model loaded")
    except Exception:
        return None, None, FALLBACK_RESPONSE

    adapter_path = ADAPTERS_DIR / f"{model_name}_adapter"
    warning: Optional[str] = None

    if adapter_path.exists():
        try:
            model = PeftModel.from_pretrained(base_model, str(adapter_path))
        except Exception:
            model = base_model
            warning = "Running base model (LoRA adapter exists but failed to load)."
    else:
        model = base_model
        warning = "Running base model (fine-tuning skipped or adapter unavailable)."

    _MODEL_CACHE[model_name] = {"model": model, "tokenizer": tokenizer, "warning": warning}
    return model, tokenizer, warning


def _lookup_customer_by_id(customer_id: str) -> Optional[str]:
    """Return customer name from first dataset file containing id/name fields."""
    datasets_dir = ROOT_DIR / "datasets"

    for dataset_file in datasets_dir.iterdir():
        if not dataset_file.is_file():
            continue

        suffix = dataset_file.suffix.lower()
        try:
            if suffix == ".csv":
                import csv

                with open(dataset_file, "r", encoding="utf-8", errors="ignore") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if str(row.get("id", "")).strip() == str(customer_id).strip():
                            name = row.get("name") or row.get("customer_name")
                            if name:
                                return str(name)

            elif suffix == ".json":
                import json

                with open(dataset_file, "r", encoding="utf-8", errors="ignore") as f:
                    data = json.load(f)

                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and str(item.get("id", "")).strip() == str(customer_id).strip():
                            name = item.get("name") or item.get("customer_name")
                            if name:
                                return str(name)
                elif isinstance(data, dict):
                    if str(data.get("id", "")).strip() == str(customer_id).strip():
                        name = data.get("name") or data.get("customer_name")
                        if name:
                            return str(name)

            elif suffix == ".txt":
                with open(dataset_file, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        parts = [p.strip() for p in line.strip().split(",") if p.strip()]
                        if len(parts) >= 2 and parts[0] == str(customer_id).strip():
                            return parts[1]
        except Exception:
            continue

    return None


def generate_response(model_name: str, prompt: str, max_tokens: int = 100) -> str:
    """Generate a response using the selected model and any trained LoRA adapter."""

    # 1) Quick structured dataset answer for ID lookup and matching use-cases.
    import re

    match = re.search(r"customer\s+(?:id|ID)\s*(?:is|=)?\s*(\d+)", prompt, re.IGNORECASE)
    if match:
        customer_id = match.group(1)
        customer_name = _lookup_customer_by_id(customer_id)
        if customer_name:
            return f"Customer id {customer_id} corresponds to name: {customer_name}."

    # 2) General-purpose LLM generation fallback.
    model, tokenizer, warning = _load_model_and_tokenizer(model_name)
    if model is None or tokenizer is None:
        return FALLBACK_RESPONSE

    try:
        model_device = getattr(model, "device", None)
        if model_device is None:
            model_device = next(model.parameters()).device

        inputs = tokenizer(prompt, return_tensors="pt")
        inputs = {key: value.to(model_device) for key, value in inputs.items()}

        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.7,
            pad_token_id=tokenizer.eos_token_id,
        )
        decoded = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        if decoded.startswith(prompt):
            decoded = decoded[len(prompt) :].strip()
        return f"{warning}\n{decoded}".strip() if warning else decoded
    except Exception:
        return FALLBACK_RESPONSE

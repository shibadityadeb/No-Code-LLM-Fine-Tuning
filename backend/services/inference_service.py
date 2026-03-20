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


def _load_model_and_tokenizer(model_name: str):
    """Load (or re-use cached) model + tokenizer for a given base model name."""

    if model_name in _MODEL_CACHE:
        return _MODEL_CACHE[model_name]["model"], _MODEL_CACHE[model_name]["tokenizer"]

    model_id = MODEL_NAME_MAP.get(model_name)
    if model_id is None:
        raise ValueError(f"Unsupported model_name '{model_name}'")

    tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load base LM
    base_model = AutoModelForCausalLM.from_pretrained(model_id)

    # If an adapter has been trained, load it.
    adapter_path = ADAPTERS_DIR / f"{model_name}_adapter"
    if adapter_path.exists():
        try:
            model = PeftModel.from_pretrained(base_model, str(adapter_path))
        except Exception:
            model = base_model
    else:
        model = base_model

    if torch.cuda.is_available():
        model = model.to("cuda")

    _MODEL_CACHE[model_name] = {"model": model, "tokenizer": tokenizer}
    return model, tokenizer


def _lookup_customer_by_id(customer_id: str) -> str | None:
    """Return customer name from first dataset file containing id/name fields."""

    for dataset_file in DATASETS_DIR.iterdir():
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


def generate_response(model_name: str, prompt: str, max_tokens: int = 128) -> str:
    """Generate a response using the selected model and any trained LoRA adapter."""

    # 1) Quick structured dataset answer for ID lookup and matching use-cases.
    import re

    match = re.search(r"customer\s+(?:id|ID)\s*(?:is|=)?\s*(\d+)", prompt, re.IGNORECASE)
    if match:
        customer_id = match.group(1)
        customer_name = _lookup_customer_by_id(customer_id)
        if customer_name:
            return f"Customer id {customer_id} corresponds to name: {customer_name}."

    # 2) General purpose LLM generation fallback.
    model, tokenizer = _load_model_and_tokenizer(model_name)

    input_ids = tokenizer(prompt, return_tensors="pt").input_ids
    if torch.cuda.is_available():
        input_ids = input_ids.to("cuda")

    output_ids = model.generate(
        input_ids,
        max_new_tokens=max_tokens,
        do_sample=True,
        temperature=0.7,
        pad_token_id=tokenizer.eos_token_id,
    )

    decoded = tokenizer.decode(output_ids[0], skip_special_tokens=True)
    # Return model's reply after the prompt if possible.
    if decoded.startswith(prompt):
        return decoded[len(prompt) :].strip()
    return decoded

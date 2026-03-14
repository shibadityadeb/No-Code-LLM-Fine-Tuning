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


def generate_response(model_name: str, prompt: str, max_tokens: int = 128) -> str:
    """Generate a response using the selected model and any trained LoRA adapter."""

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

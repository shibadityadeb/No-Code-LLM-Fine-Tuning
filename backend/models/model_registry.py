# Tracks available base models and their configurations.

MODELS = {
    "gpt-2": {
        "name": "GPT-2",
        "description": "Small open-source model for quick experiments.",
    },
    "llama-2": {
        "name": "LLaMA 2",
        "description": "Research model (requires appropriate weights).",
    },
}


def get_model_info(key: str):
    return MODELS.get(key)

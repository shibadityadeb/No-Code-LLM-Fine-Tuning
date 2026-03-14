import os

# Simple configuration helper.

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8000))
DATASETS_DIR = os.getenv("DATASETS_DIR", "../datasets")
ADAPTERS_DIR = os.getenv("ADAPTERS_DIR", "../adapters")

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import upload, training, chat, download
from backend.utils.status_store import init_status_file

app = FastAPI(title="llm-finetune-studio")

os.makedirs("logs", exist_ok=True)


@app.on_event("startup")
def startup() -> None:
    init_status_file()

# Allow frontend dev server to access backend APIs.
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://no-code-llm-fine-tuning.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{full_path:path}")
async def preflight_handler():
    return {"message": "OK"}

app.include_router(upload.router, prefix="/api")
app.include_router(training.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(download.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "llm-finetune-studio backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}

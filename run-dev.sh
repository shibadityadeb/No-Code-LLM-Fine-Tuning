#!/bin/bash
cd /Users/shibadityadeb/Desktop/llm-finetune-studio

# Start backend in background
python -m uvicorn backend.main:app --host localhost --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
cd frontend
npm run dev -- --host localhost --port 5174

# Kill backend when frontend exits
kill $BACKEND_PID
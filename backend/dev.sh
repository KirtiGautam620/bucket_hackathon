#!/bin/bash

# Start user-facing message
echo "🚀 Starting Full Stack Backend (Node.js + Python OCR)..."

# Function to handle kill signal
cleanup() {
    echo "🛑 Shutting down services..."
    kill $(jobs -p)
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# Start OCR Service in background
./start_ocr.sh &

# Wait a moment for OCR to initialize
sleep 2

# Start Node.js Server
npm run dev

# Wait for all background jobs
wait

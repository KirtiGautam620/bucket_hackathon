#!/bin/bash

# Start PaddleOCR Service

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Run ./setup_ocr.sh first"
    exit 1
fi

echo "🚀 Starting PaddleOCR service on port 5001..."
python3 ocr_service.py

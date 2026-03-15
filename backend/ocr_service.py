from paddleocr import PaddleOCR
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import numpy as np

app = Flask(__name__)
CORS(app)

# Initialize PaddleOCR (English language)
# Optimizations: use_angle_cls=False (faster), use_gpu=False (skip check), show_log=False (less IO)
ocr = PaddleOCR(lang='en')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'PaddleOCR'}), 200

@app.route('/ocr', methods=['POST'])
def perform_ocr():
    """
    Perform OCR on uploaded image
    Expects: multipart/form-data with 'image' field
    Returns: JSON with extracted text
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        print(f"Received image: {file.filename}, Content-Type: {file.content_type}")
        
        # Read and convert image
        image_bytes = file.read()
        try:
            image = Image.open(io.BytesIO(image_bytes))
            print(f"Image opened successfully. Size: {image.size}, Mode: {image.mode}")
        except Exception as img_err:
            print(f"Failed to open image: {str(img_err)}")
            return jsonify({'error': 'Invalid image file', 'message': str(img_err)}), 400
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
            # print("Converted image to RGB")

        # Optimization: Resize image if too large (improves speed & reduces memory usage)
        max_dimension = 800
        if max(image.size) > max_dimension:
            ratio = max_dimension / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            print(f"Resized image to {new_size} for faster processing")
        
        # Convert PIL Image to numpy array for PaddleOCR
        img_array = np.array(image)
        
        # Perform OCR
        print("Starting PaddleOCR processing...")
        # cls=False skips angle classification step
        result = ocr.ocr(img_array)
        print("OCR processing complete")
        
        if not result:
            print("No result returned from PaddleOCR")
            return jsonify({
                'rawText': '',
                'lines': [],
                'message': 'No text detected (empty result)'
            }), 200

        # Extract text based on result format
        text_lines = []
        
        # Check for new format (list of dicts)
        if isinstance(result[0], dict) and 'rec_texts' in result[0]:
            print("Detected PaddleOCR v3 format")
            data = result[0]
            rec_texts = data.get('rec_texts', [])
            rec_scores = data.get('rec_scores', [])
            
            for text, score in zip(rec_texts, rec_scores):
                if score > 0.5:
                    text_lines.append(text)
                    
        # Check for old format (list of lists)
        elif isinstance(result[0], list):
             print("Detected PaddleOCR v2 format")
             for line in result[0]:
                if line and len(line) >= 2:
                    text = line[1][0]  # Extract text from result structure
                    confidence = line[1][1]  # Confidence score
                    
                    if confidence > 0.5:
                        text_lines.append(text)
        else:
             print(f"Unknown result format: {type(result[0])}")
        
        raw_text = '\n'.join(text_lines)
        print(f"Extracted {len(text_lines)} lines of text")
        
        return jsonify({
            'rawText': raw_text,
            'lines': text_lines,
            'success': True
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f'OCR Error: {str(e)}')
        return jsonify({
            'error': 'OCR processing failed',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    print('Starting PaddleOCR service on http://localhost:5001')
    print('Initializing PaddleOCR model (this may take a moment)...')
    # Optimization: debug=False prevents auto-reload overhead and some memory leaks
    app.run(host='0.0.0.0', port=5001, debug=False)

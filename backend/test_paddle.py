from paddleocr import PaddleOCR
import numpy as np
from PIL import Image

try:
    print("Initializing PaddleOCR...")
    ocr = PaddleOCR(lang='en')
    print("PaddleOCR initialized successfully")
    
    # Create black image with some text (simulated)
    # Actually just a blank image to test pipeline
    img = Image.new('RGB', (100, 30), color = (255, 255, 255))
    img_array = np.array(img)
    
    print("Running OCR on dummy image...")
    result = ocr.ocr(img_array)
    print(f"Result: {result}")
    print("PaddleOCR test passed!")
    
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"PaddleOCR failed: {e}")

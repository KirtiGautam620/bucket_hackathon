const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5001/ocr';

/**
 * Extract structured contact information from raw OCR text
 */
function extractContactInfo(rawText) {
    if (!rawText) {
        return {
            name: null,
            phone: null,
            email: null,
            company: null,
            rawText: ''
        };
    }

    const lines = rawText.split('\n').filter(line => line.trim());

    // Regex patterns
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+91|0)?[6-9]\d{9}/g;
    const internationalPhoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

    // Extract email
    const emailMatch = rawText.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : null;

    // Extract phone - try Indian format first, then international
    const indianPhoneMatch = rawText.match(phoneRegex);
    const internationalPhoneMatch = rawText.match(internationalPhoneRegex);
    const phone = indianPhoneMatch?.[0] || internationalPhoneMatch?.[0] || null;

    // Extract name (first line that looks like a name)
    const name = lines.find(line => {
        const trimmed = line.trim();
        return trimmed.length > 2 &&
            trimmed.length < 50 &&
            !emailRegex.test(trimmed) &&
            !phoneRegex.test(trimmed) &&
            /^[a-zA-Z\s.]+$/.test(trimmed);
    }) || null;

    // Extract company (line with business keywords)
    const businessKeywords = /ltd|llc|inc|corp|pvt|limited|technologies|tech|solutions|services|group|company|industries|enterprises/i;
    const company = lines.find(line =>
        businessKeywords.test(line) &&
        line !== name &&
        !emailRegex.test(line)
    ) || null;

    return {
        name,
        phone,
        email,
        company,
        rawText
    };
}

/**
 * Scan image using OCR service
 * POST /api/ocr/scan
 */
exports.scanImage = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        console.log('Processing image:', req.file.filename);

        // Create form data to send to Python OCR service
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));

        // Call Python OCR service
        const ocrResponse = await axios.post(OCR_SERVICE_URL, formData, {
            headers: formData.getHeaders(),
            timeout: 30000 // 30 second timeout
        });

        const { rawText, lines } = ocrResponse.data;

        console.log('OCR extracted text:', rawText);

        // Extract structured contact information
        const extracted = extractContactInfo(rawText);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            ...extracted
        });

    } catch (error) {
        console.error('OCR Controller Error:', error.message);

        // Log detailed error from Python service if available
        if (error.response) {
            console.error('Python Service Error Data:', JSON.stringify(error.response.data));
            console.error('Python Service Status:', error.response.status);
        }

        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // Check if it's a connection error to Python service
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'OCR service is not running. Please start the Python OCR service on port 5001.'
            });
        }

        // Return the specific error from Python service if available
        const errorMessage = error.response?.data?.message || error.message;
        const errorType = error.response?.data?.error || 'OCR processing failed';

        res.status(500).json({
            success: false,
            error: errorType,
            message: errorMessage
        });
    }
};

/**
 * Health check for OCR service
 * GET /api/ocr/health
 */
exports.checkHealth = async (req, res) => {
    try {
        const response = await axios.get('http://localhost:5001/health', {
            timeout: 5000
        });
        res.json({
            backend: 'healthy',
            ocrService: response.data
        });
    } catch (error) {
        res.status(503).json({
            backend: 'healthy',
            ocrService: 'unavailable',
            message: 'Python OCR service is not running'
        });
    }
};

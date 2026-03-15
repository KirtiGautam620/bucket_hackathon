/**
 * Simple OCR service for extracting text from visiting cards
 * Uses basic pattern matching for contact information
 * 
 * For production, integrate with:
 * - Google ML Kit Vision
 * - Tesseract.js
 * - AWS Textract
 */

export interface OCRResult {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    rawText: string;
}

// Pattern matching for common fields
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const INDIAN_PHONE_REGEX = /(\+91|0)?[6-9]\d{9}/g;

/**
 * Extract contact information from OCR text
 * This is a mock implementation - replace with actual ML Kit Vision integration
 */
export const extractContactInfo = (rawText: string): OCRResult => {
    const lines = rawText.split('\n').filter(line => line.trim());

    // Extract email
    const emailMatch = rawText.match(EMAIL_REGEX);
    const email = emailMatch ? emailMatch[0] : undefined;

    // Extract phone - try Indian format first, then international
    const indianPhoneMatch = rawText.match(INDIAN_PHONE_REGEX);
    const internationalPhoneMatch = rawText.match(PHONE_REGEX);
    const phone = indianPhoneMatch?.[0] || internationalPhoneMatch?.[0] || undefined;

    // Extract name (usually first line or line before email)
    let name: string | undefined;
    if (lines.length > 0) {
        // Simple heuristic: first line that looks like a name
        name = lines.find(line => {
            const trimmed = line.trim();
            return trimmed.length > 2 &&
                trimmed.length < 50 &&
                !trimmed.match(EMAIL_REGEX) &&
                !trimmed.match(PHONE_REGEX) &&
                /^[a-zA-Z\s.]+$/.test(trimmed);
        });
    }

    // Extract company (usually second line or line with common business words)
    let company: string | undefined;
    const businessKeywords = /ltd|llc|inc|corp|pvt|limited|technologies|tech|solutions|services|group|company/i;
    company = lines.find(line =>
        businessKeywords.test(line) &&
        line !== name &&
        !line.match(EMAIL_REGEX)
    );

    return {
        name,
        phone,
        email,
        company,
        rawText,
    };
};

/**
 * Perform OCR by uploading image to backend service
 * Backend will use PaddleOCR to extract text from image
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get the backend API URL dynamically
 */
const getApiUrl = () => {
    // 1. Check environment variable
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. In development, try to use the host URI from Expo Constants
    if (__DEV__ && Constants.expoConfig?.hostUri) {
        const host = Constants.expoConfig.hostUri.split(':')[0];
        return `http://${host}:3000`;
    }

    // 3. Fallback for Android Emulator
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3000';
    }

    // 4. Fallback for iOS Simulator / Web
    return 'http://localhost:3000';
};

/**
 * Perform OCR by uploading image to backend service
 * Backend will use PaddleOCR to extract text from image
 */
export const performOCR = async (imageUri: string): Promise<OCRResult> => {
    const API_URL = getApiUrl();
    console.log('Using OCR Service URL:', `${API_URL}/api/ocr/scan`);

    try {
        // Create form data for image upload
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'visiting-card.jpg',
        } as any);

        // Upload to backend OCR endpoint
        const response = await fetch(`${API_URL}/api/ocr/scan`, {
            method: 'POST',
            body: formData,

        });

        // Handle non-200 responses
        if (!response.ok) {
            let errorMessage = 'OCR request failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
                errorMessage = `Server returned ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
            // Prefer message from server if available, as it contains more detail now
            const detailedError = result.message || result.error || 'OCR processing failed';
            throw new Error(detailedError);
        }

        console.log('OCR result:', result);

        return {
            name: result.name || undefined,
            phone: result.phone || undefined,
            email: result.email || undefined,
            company: result.company || undefined,
            rawText: result.rawText || '',
        };

    } catch (error: any) {
        console.error('OCR upload error:', error);

        // Enhance error message for common network issues
        if (error.message.includes('Network request failed')) {
            throw new Error(`Cannot connect to backend at ${API_URL}. Please check if server is running and accessible.`);
        }

        throw error;
    }
};

/**
 * Process image and extract contact information
 * Main entry point for OCR functionality
 */
export const scanVisitingCard = async (imageUri: string): Promise<OCRResult> => {
    try {
        console.log('Starting OCR scan for image:', imageUri);
        const result = await performOCR(imageUri);
        console.log('OCR completed successfully');
        return result;
    } catch (error: any) {
        console.error('OCR scan failed:', error);
        // Propagate the actual error message
        throw new Error(error.message || 'Failed to scan visiting card');
    }
};

/**
 * Validate extracted contact information
 */
export const validateOCRResult = (result: OCRResult): {
    isValid: boolean;
    errors: string[];
} => {
    const errors: string[] = [];

    if (!result.name && !result.phone && !result.email) {
        errors.push('No contact information found');
    }

    if (result.email && !EMAIL_REGEX.test(result.email)) {
        errors.push('Invalid email format');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

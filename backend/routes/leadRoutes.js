const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    createLead,
    uploadAudio,
    getAllLeads,
    getLeadById,
    deleteLead,
} = require('../controllers/leadController');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow audio and image files
        const allowedMimes = [
            'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
            'image/jpeg', 'image/png', 'image/jpg'
        ];

        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio and image files are allowed'));
        }
    },
});

// Routes
router.post('/leads', createLead);
router.post('/upload-audio', upload.single('audio'), uploadAudio);
router.post('/upload-image', upload.single('image'), require('../controllers/leadController').uploadImage);
router.get('/leads', getAllLeads);
router.get('/leads/:id', getLeadById);
router.delete('/leads/:id', deleteLead);

module.exports = router;

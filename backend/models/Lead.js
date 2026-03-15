const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        default: null,
    },
    phone: {
        type: String,
        default: null,
    },
    email: {
        type: String,
        default: null,
    },
    company: {
        type: String,
        default: null,
    },
    audioPath: {
        type: String,
        default: null,
    },
    transcription: {
        type: String,
        default: null,
    },
    summary: {
        type: String,
        default: null,
    },
    interests: [{
        type: String, // Extracted interests from WhatsApp analysis
    }],
    interactionHistory: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        messageType: { type: String, enum: ['text', 'audio'], default: 'text' },
    }],
    createdAt: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
});

// Create indexes for faster lookups
leadSchema.index({ phone: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);

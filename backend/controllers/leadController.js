const Lead = require('../models/Lead');
const fs = require('fs');
const path = require('path');

/**
 * Create a new lead
 * POST /api/leads
 */
exports.createLead = async (req, res) => {
    try {
        const { id, name, phone, email, company, createdAt } = req.body;

        // Validate required fields
        if (!id || !createdAt) {
            return res.status(400).json({
                success: false,
                message: 'ID and createdAt are required',
            });
        }

        // Check if lead already exists
        const existingLead = await Lead.findOne({ id });
        if (existingLead) {
            return res.status(200).json({
                success: true,
                message: 'Lead already exists',
                lead: existingLead,
            });
        }

        // Create new lead
        const lead = new Lead({
            id,
            name,
            phone,
            email,
            company,
            createdAt,
        });

        await lead.save();

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            lead,
        });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Upload audio file for a lead
 * POST /api/upload-audio
 */
exports.uploadAudio = async (req, res) => {
    try {
        const { leadId } = req.body;

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: 'Lead ID is required',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file uploaded',
            });
        }

        // Find the lead
        const lead = await Lead.findOne({ id: leadId });
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found',
            });
        }

        // Update lead with audio path
        lead.audioPath = req.file.path;

        // Process audio with OpenAI if API key is present
        let transcription = null;
        let summary = null;

        if (process.env.OPENAI_API_KEY) {
            try {
                console.log(`Transcribing audio for lead ${leadId}...`);
                const { transcribeAudio, summarizeText } = require('../services/openaiService');

                transcription = await transcribeAudio(req.file.path);
                console.log('Transcription complete');

                if (transcription) {
                    lead.transcription = transcription;

                    console.log('Summarizing transcription...');
                    summary = await summarizeText(transcription);
                    lead.summary = summary;
                    console.log('Summarization complete');
                }
            } catch (aiError) {
                console.error('AI Processing failed:', aiError);
                // Report the specific AI error in the response but keep the success: true for the upload itself
                const aiErrorMessage = aiError.error?.message || aiError.message || 'Unknown AI error';
                return res.status(200).json({
                    success: true,
                    message: `Audio uploaded successfully, but AI processing failed: ${aiErrorMessage}`,
                    audioPath: req.file.path,
                    transcription: null,
                    summary: null,
                    aiError: aiErrorMessage
                });
            }
        } else {
            console.warn('OPENAI_API_KEY not found, skipping transcription');
        }

        await lead.save();

        res.status(200).json({
            success: true,
            message: 'Audio uploaded successfully',
            audioPath: req.file.path,
            transcription,
            summary
        });
    } catch (error) {
        console.error('Error uploading audio:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Upload image file for a lead
 * POST /api/upload-image
 */
exports.uploadImage = async (req, res) => {
    try {
        const { leadId } = req.body;

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: 'Lead ID is required',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded',
            });
        }

        // Find the lead
        const lead = await Lead.findOne({ id: leadId });
        if (!lead) {
            // Cleanup file if lead not found
            if (req.file && req.file.path) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting orphaned file:', err);
                });
            }
            return res.status(404).json({
                success: false,
                message: 'Lead not found',
            });
        }

        // Update lead with image path
        lead.imagePath = req.file.path;
        await lead.save();

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            imagePath: req.file.path,
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Get all leads
 * GET /api/leads
 */
exports.getAllLeads = async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: leads.length,
            leads,
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Get a single lead by ID
 * GET /api/leads/:id
 */
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findOne({ id: req.params.id });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found',
            });
        }

        res.status(200).json({
            success: true,
            lead,
        });
    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * Delete a lead
 * DELETE /api/leads/:id
 */
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ id: req.params.id });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found',
            });
        }

        // Delete audio file if exists
        if (lead.audioPath && fs.existsSync(lead.audioPath)) {
            fs.unlinkSync(lead.audioPath);
        }

        await Lead.deleteOne({ id: req.params.id });

        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

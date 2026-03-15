const OpenAI = require('openai');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Lead = require('../models/Lead');
const Scheme = require('../models/Scheme');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

exports.handleIncomingMessage = async (req, res) => {
    try {
        const { From, Body, MediaUrl0, MediaContentType0 } = req.body;
        const phoneNumber = From.replace('whatsapp:', '');

        console.log(`Received message from ${phoneNumber}: ${Body || 'Media'}`);

        // Find or create lead
        let lead = await Lead.findOne({ phone: phoneNumber });
        if (!lead) {
            lead = new Lead({
                phone: phoneNumber,
                createdAt: Date.now(),
                id: new mongoose.Types.ObjectId().toString(), // Or generate a UUID
            });
        }

        let userMessage = Body;
        let messageType = 'text';

        // diverse handling for voice notes
        if (MediaUrl0 && MediaContentType0 && MediaContentType0.startsWith('audio/')) {
            messageType = 'audio';
            const audioPath = path.join(uploadsDir, `${phoneNumber}_${Date.now()}.ogg`);

            // Download audio
            const writer = fs.createWriteStream(audioPath);
            const response = await axios({
                url: MediaUrl0,
                method: 'GET',
                responseType: 'stream',
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Transcribe audio using OpenAI Whisper
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: "whisper-1",
            });

            userMessage = transcription.text;
            console.log(`Transcribed audio: ${userMessage}`);

            // Update lead with audio path (optional: cleanup later)
            // lead.audioPath = audioPath; 
        }

        // Add user message to history
        lead.interactionHistory.push({
            role: 'user',
            content: userMessage,
            messageType: messageType
        });

        // specific extraction logic
        const extractionResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Extract key investment interests from the user's message. Return a JSON array of strings (e.g., ['retirement', 'high return']). If none found, return []."
                },
                { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" }
        });

        const interests = JSON.parse(extractionResponse.choices[0].message.content).interests || [];

        // Update interests without duplicates
        const uniqueInterests = [...new Set([...(lead.interests || []), ...interests])];
        lead.interests = uniqueInterests;

        // Find relevant schemes
        let recommendations = [];
        if (uniqueInterests.length > 0) {
            // Simple regex-based matching for now
            const regexInterests = uniqueInterests.map(i => new RegExp(i, 'i'));
            recommendations = await Scheme.find({
                $or: [
                    { interestTags: { $in: regexInterests } },
                    { category: { $in: regexInterests } },
                    { description: { $in: regexInterests } } // broader search
                ]
            }).limit(3);
        }

        // Generate response
        const systemPrompt = `
            You are a helpful investment assistant. The user is asking about schemes.
            Their detected interests are: ${uniqueInterests.join(', ')}.
            Here are some recommended schemes based on their interests:
            ${JSON.stringify(recommendations)}
            
            Draft a friendly WhatsApp response recommending these schemes. Keep it concise.
            If no schemes match, ask clarifying questions to understand their needs better.
        `;

        const chatResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                ...lead.interactionHistory.map(h => ({ role: h.role, content: h.content })).slice(-5) // context window
            ]
        });

        const assistantMessage = chatResponse.choices[0].message.content;

        // Add assistant response to history
        lead.interactionHistory.push({
            role: 'assistant',
            content: assistantMessage,
            messageType: 'text'
        });

        await lead.save();

        // Send response via Twilio
        await client.messages.create({
            body: assistantMessage,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: From
        });

        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing WhatsApp message:', error);
        res.status(500).send('Internal Server Error');
    }
};

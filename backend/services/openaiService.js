const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio using OpenAI Whisper
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} - The transcription text
 */
exports.transcribeAudio = async (filePath) => {
    if (process.env.MOCK_AI === 'true') {
        console.log('MOCK_AI is enabled, returning placeholder transcription');
        return "This is a mock transcription because MOCK_AI is enabled. The user discussed a potential lead for the AI-powered logistics platform.";
    }

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
            response_format: "text",
        });
        return transcription;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
};

/**
 * Summarize text using OpenAI GPT-4o-mini
 * @param {string} text - The text to summarize
 * @returns {Promise<string>} - The summary
 */
exports.summarizeText = async (text) => {
    if (process.env.MOCK_AI === 'true') {
        console.log('MOCK_AI is enabled, returning placeholder summary');
        return "Mock Summary: Lead is interested in AI logistics. Contact: unknown. Next steps: Follow up next week.";
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes leads from transcripts. Extract key information like name, intent, contact details, and next steps. Keep it concise."
                },
                {
                    role: "user",
                    content: `Please summarize the following transcript:\n\n${text}`
                }
            ],
            temperature: 0.7,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error summarizing text:', error);
        throw error;
    }
};

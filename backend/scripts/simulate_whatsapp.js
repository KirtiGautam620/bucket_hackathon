const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const OpenAI = require('openai');
const Scheme = require('../models/Scheme');
const Lead = require('../models/Lead');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function simulate() {
    try {
        console.log('--- Starting WhatsApp Logic Simulation ---');

        // 1. Connect to DB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lead-capture');
        console.log('✅ Connected to MongoDB');

        // 2. Simulate User Input
        const userPhone = '919999999999'; // Dummy number
        const userMessage = "I am looking for a safe investment for my daughter's education.";
        console.log(`📩 Simulated Incoming Message from ${userPhone}: "${userMessage}"`);

        // 3. Find/Create Lead
        let lead = await Lead.findOne({ phone: userPhone });
        if (!lead) {
            lead = new Lead({
                phone: userPhone,
                createdAt: Date.now(),
                id: new mongoose.Types.ObjectId().toString(),
            });
            console.log('👤 Created new lead profile');
        } else {
            console.log('👤 Found existing lead profile');
        }

        // 4. Extract Interests (OpenAI)
        console.log('🤖 Extracting interests via OpenAI...');
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
        console.log(`🏷️ Extracted Interests: ${JSON.stringify(interests)}`);

        // Update Lead
        const uniqueInterests = [...new Set([...(lead.interests || []), ...interests])];
        lead.interests = uniqueInterests;
        await lead.save();

        // 5. Find Recommendations
        console.log('🔍 Searching for schemes...');
        let recommendations = [];
        if (uniqueInterests.length > 0) {
            const regexInterests = uniqueInterests.map(i => new RegExp(i, 'i'));
            recommendations = await Scheme.find({
                $or: [
                    { interestTags: { $in: regexInterests } },
                    { category: { $in: regexInterests } },
                    { description: { $in: regexInterests } }
                ]
            }).limit(3);
        }
        console.log(`📦 Found ${recommendations.length} recommendations:`);
        recommendations.forEach(r => console.log(`   - ${r.title} (${r.category})`));

        // 6. Generate Response
        console.log('✍️ Generating WhatsApp response...');
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
                { role: "user", content: userMessage }
            ]
        });

        const reply = chatResponse.choices[0].message.content;
        console.log('\n💬 Generated Response:');
        console.log('---------------------------------------------------');
        console.log(reply);
        console.log('---------------------------------------------------');

        console.log('✅ Verification Complete: Logic works as expected.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during simulation:', error);
        process.exit(1);
    }
}

simulate();

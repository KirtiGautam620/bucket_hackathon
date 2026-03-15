require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead-capture';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        try {
            const leads = await Lead.find().sort({ createdAt: -1 });

            console.log('\n--- LEADS DATA ---\n');
            if (leads.length === 0) {
                console.log('No leads found.');
            } else {
                console.log(`Found ${leads.length} leads:\n`);
                leads.forEach(lead => {
                    console.log('-----------------------------------');
                    console.log(`ID:       ${lead.id}`);
                    console.log(`Name:     ${lead.name}`);
                    console.log(`Company:  ${lead.company}`);
                    console.log(`Email:    ${lead.email}`);
                    console.log(`Phone:    ${lead.phone}`);
                    console.log(`Audio:    ${lead.audioPath ? 'Yes' : 'No'}`);
                    console.log(`Created:  ${new Date(lead.createdAt).toLocaleString()}`);
                });
                console.log('-----------------------------------');
            }
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            mongoose.connection.close();
            console.log('\nConnection closed.');
        }
    })
    .catch((err) => {
        console.error('❌ Connection error:', err);
        process.exit(1);
    });

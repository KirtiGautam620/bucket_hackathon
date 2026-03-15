const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');

const schemes = [
    {
        id: 'scheme_001',
        title: 'Safe Future Pension Plan',
        description: 'A low-risk pension plan designed for retirement security.',
        category: 'Retirement',
        interestTags: ['retirement', 'pension', 'safe', 'long term', 'low risk'],
        minInvestment: 5000,
        roi: '6-7%'
    },
    {
        id: 'scheme_002',
        title: 'High Growth Equity Fund',
        description: 'Aggressive growth fund investing in top equity markets.',
        category: 'Mutual Fund',
        interestTags: ['growth', 'high return', 'equity', 'shares', 'stock market'],
        minInvestment: 10000,
        roi: '12-15%'
    },
    {
        id: 'scheme_003',
        title: 'Child Education Savings',
        description: 'Dedicated savings plan to secure your child\'s future education.',
        category: 'Education',
        interestTags: ['education', 'child', 'children', 'college', 'school'],
        minInvestment: 2000,
        roi: '8-9%'
    },
    {
        id: 'scheme_004',
        title: 'Gold Bond Sovereign',
        description: 'Government backed gold bonds with annual interest.',
        category: 'Gold',
        interestTags: ['gold', 'safe', 'government', 'bond'],
        minInvestment: 5000,
        roi: '2.5% + Appreciation'
    },
    {
        id: 'scheme_005',
        title: 'Health Shield Plus',
        description: 'Comprehensive health insurance covering family and critical illness.',
        category: 'Insurance',
        interestTags: ['health', 'insurance', 'medical', 'hospital'],
        minInvestment: 10000,
        roi: 'N/A'
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lead-capture');
        console.log('Connected to MongoDB');

        await Scheme.deleteMany({});
        console.log('Cleared existing schemes');

        await Scheme.insertMany(schemes);
        console.log(`Seeded ${schemes.length} schemes`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();

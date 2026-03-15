const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    interestTags: [{
        type: String, // e.g., 'investment', 'retirement', 'health', 'education'
    }],
    minInvestment: {
        type: Number,
        default: 0,
    }, 
    durationMonths: {
        type: Number,
        default: 12,
    },
    roi: {
        type: String, // e.g., "5-7%"
        default: "N/A",
    }
}, {
    timestamps: true,
});

// Indexes for faster searching
schemeSchema.index({ category: 1 });
schemeSchema.index({ interestTags: 1 });

module.exports = mongoose.model('Scheme', schemeSchema);

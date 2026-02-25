const { Schema } = require("mongoose");

const QuestionSchema = Schema({
    customId: { 
        type: String, 
        required: true 
    },
    text: {
        type: String,
        required: true
    },
    reviewerText: {
        type: String,
        default: ""
    },
    type: { 
        type: String, 
        enum: ['multiple_choice', 'text', 'rating'], 
        default: 'multiple_choice' 
    },
    options: [{
        text: String,
        category: String
    }]
});

module.exports = QuestionSchema
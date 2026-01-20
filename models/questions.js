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
    type: { 
        type: String, 
        enum: ['multiple_choice', 'text', 'rating'], 
        default: 'multiple_choice' 
    },
    options: [{
        text: String,
        category: String
    }] // Solo si es multiple_choice
});

module.exports = QuestionSchema
const { Schema } = require("mongoose");

const AnswerSchema = Schema({
    customId: { 
        type: String, 
        required: true 
    },
    value: Schema.Types.Mixed,
});

module.exports = AnswerSchema
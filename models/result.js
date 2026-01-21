const { Schema, model } = require("mongoose");

const ResultSchema = Schema({
    assessmentId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Assessment' 
    },
    sectionCustomId: String,
    category: String,
    title: String,
    content: String
});

ResultSchema.index({ assessmentId: 1, sectionCustomId: 1, category: 1 });

module.exports = model('Result', ResultSchema);
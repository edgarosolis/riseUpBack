const { Schema, model } = require("mongoose");
const QuestionSchema = require("./questions");

const SectionSchema = Schema({
    title: String,
    subtitle: String,
    image:String,
    color:String,
    description: String,
    questions: [QuestionSchema]
});

const AssessmentSchema = new Schema({
    title: {
        type: String, 
        required: true 
    },
    subtitle: String,
    description: String,
    image:String,
    sections: [SectionSchema],
    active: {
        type: Boolean, 
        default: true 
    }
  }, { timestamps: true });

module.exports = model('Assessment',AssessmentSchema);
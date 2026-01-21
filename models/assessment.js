const { Schema, model } = require("mongoose");
const QuestionSchema = require("./questions");

const SectionSchema = Schema({
    customId: String,
    title: String,
    subtitle: String,
    image:String,
    color:String,
    description: String,
    questions: [QuestionSchema],
    report:{
        intro: String,
        hasTable: {
            type: Boolean,
            default:false
        },
        questions: [QuestionSchema] 
    }
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
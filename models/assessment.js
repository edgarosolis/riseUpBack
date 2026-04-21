const { Schema, model } = require("mongoose");
const QuestionSchema = require("./questions");

const TableRowSchema = new Schema({
    sphere: { type: String, required: true },
    definition: { type: String, required: true }
}, { _id: false });

const SectionSchema = Schema({
    customId: String,
    title: String,
    subtitle: String,
    image:String,
    color:String,
    description: String,
    reviewerDescription: String,
    questions: [QuestionSchema],
    report:{
        intro: String,
        hasTable: {
            type: Boolean,
            default:false
        },
        tableInfo: [TableRowSchema],
        questions: [QuestionSchema] 
    }
});

const WelcomeIntroBulletSchema = new Schema({
    bold: String,
    text: String
}, { _id: false });

const WelcomeIntroSchema = new Schema({
    headings: { type: [String], default: [] },
    intro: { type: String, default: "" },
    bulletsLead: { type: String, default: "" },
    bullets: { type: [WelcomeIntroBulletSchema], default: [] },
    closingParagraphs: { type: [String], default: [] },
    callToAction: { type: String, default: "" }
}, { _id: false });

const AssessmentSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    subtitle: String,
    description: String,
    image:String,
    welcomeIntro: { type: WelcomeIntroSchema, default: () => ({}) },
    sections: [SectionSchema],
    active: {
        type: Boolean,
        default: true
    }
  }, { timestamps: true });

module.exports = model('Assessment',AssessmentSchema);
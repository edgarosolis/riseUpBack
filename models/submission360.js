const { Schema, model } = require("mongoose");
const AnswerSchema = require("./answer");

const Submission360Schema = new Schema({
    assessmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    reviewerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    revieweeId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    groupId: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    answers: [AnswerSchema],
    finished: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

Submission360Schema.index({ reviewerId: 1, revieweeId: 1, groupId: 1 });

module.exports = model('Submission360', Submission360Schema);

const { Schema, model } = require("mongoose");

const ReviewerSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewToken: {
        type: String,
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    invitedAt: {
        type: Date
    },
    lastRemindedAt: {
        type: Date
    }
});

const Group360Schema = new Schema({
    assessmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    reviewee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    reviewers: [ReviewerSchema],
    completed: {
        type: Boolean,
        default: false
    },
    deadline: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true
    },
    reportReady: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

Group360Schema.index({ group: 1 });
Group360Schema.index({ reviewee: 1, group: 1 });

module.exports = model('Group360', Group360Schema);

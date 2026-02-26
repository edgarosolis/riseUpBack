const { Schema, model } = require("mongoose");

const GroupSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required.'],
        trim: true
    },
    church: {
        type: Schema.Types.ObjectId,
        ref: 'Church',
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    assessmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Assessment'
    },
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
}, { timestamps: true });

GroupSchema.index({ church: 1 });

module.exports = model('Group', GroupSchema);

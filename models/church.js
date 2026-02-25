const { Schema, model } = require("mongoose");

const ChurchSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required.'],
        trim: true
    },
    active: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

module.exports = model('Church', ChurchSchema);

const { Schema, model } = require('mongoose');

const LoginCodeSchema = Schema({
    email: {
        type: String,
        required: [true, 'Email is required.'],
    },
    code: {
        type: String,
        required: [true, 'Code is required.'],
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    used: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

// Index for efficient lookups and automatic cleanup
LoginCodeSchema.index({ email: 1, code: 1 });
LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('LoginCode', LoginCodeSchema);

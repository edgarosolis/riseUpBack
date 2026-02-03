const { Schema, model } = require('mongoose');

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    code: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // Auto-delete after 10 minutes (TTL index)
    }
});

// Index for faster lookups
otpSchema.index({ email: 1, expiresAt: 1 });

module.exports = model('OTP', otpSchema);

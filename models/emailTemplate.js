const { Schema, model } = require("mongoose");

const EmailTemplateSchema = Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        enum: ['otp-login', '360-invitation', '360-reminder']
    },
    name: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    content: {
        heading: { type: String, default: 'Rise Up Culture' },
        greeting: { type: String, default: '' },
        bodyText: { type: String, required: true },
        buttonText: { type: String, default: '' },
        expiryText: { type: String, default: '' },
        footerText: { type: String, default: '' }
    },
    htmlBody: {
        type: String,
        required: true
    },
    textBody: {
        type: String,
        required: true
    },
    variables: [{
        type: String
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

EmailTemplateSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = model('EmailTemplate', EmailTemplateSchema);

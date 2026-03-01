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

EmailTemplateSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = model('EmailTemplate', EmailTemplateSchema);

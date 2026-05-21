const { Schema, model } = require('mongoose');

const WebhookEventLogSchema = Schema({
    source: {
        type: String,
        required: true,
        // e.g. 'zapier-learnworlds'
    },
    eventId: {
        type: String,
        required: true,
    },
    email: {
        type: String,
    },
    productId: {
        type: String,
    },
    action: {
        type: String,
        // 'created' | 'upgraded' | 'noop' | 'duplicate' | 'error'
    },
    payload: {
        type: Schema.Types.Mixed,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

WebhookEventLogSchema.index({ source: 1, eventId: 1 }, { unique: true });

module.exports = model('WebhookEventLog', WebhookEventLogSchema);

// Diagnostic: print the most recent LearnWorlds→Zapier provisioning payloads so
// we can confirm exactly which fields the Zap sends for the user's name (the
// mis-map that left firstName empty and put the name in lastName).
//
// Every provision call stores its raw request body in WebhookEventLog.payload,
// so this is the ground truth for fixing the Zap field mapping.
//
// Run on the server (where .env has MONGODB):
//   node scripts/inspectWebhookPayloads.js [limit]

const mongoose = require('mongoose');
require('dotenv').config();
const WebhookEventLog = require('../models/webhookEventLog');
const User = require('../models/user');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB, { dbName: 'RiseUp' });
        const limit = Number(process.argv[2]) || 20;

        const logs = await WebhookEventLog.find({ source: 'zapier-learnworlds' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        if (!logs.length) {
            console.log('No zapier-learnworlds webhook logs found.');
            process.exit(0);
        }

        for (const log of logs) {
            const p = log.payload || {};
            const u = log.userId
                ? await User.findById(log.userId).select('firstName lastName email').lean()
                : null;

            console.log('────────────────────────────────────────');
            console.log('when    :', log.createdAt && log.createdAt.toISOString());
            console.log('action  :', log.action);
            console.log('email   :', log.email);
            console.log('payload :', JSON.stringify(p));
            console.log('  payload.firstName:', JSON.stringify(p.firstName));
            console.log('  payload.lastName :', JSON.stringify(p.lastName));
            const nameKeys = Object.keys(p).filter((k) => /name|user/i.test(k));
            console.log('  name-ish keys    :', nameKeys.length ? nameKeys.join(', ') : '(none)');
            if (u) {
                console.log(
                    'stored  : firstName=' + JSON.stringify(u.firstName) +
                    ' lastName=' + JSON.stringify(u.lastName)
                );
            }
        }

        console.log('────────────────────────────────────────');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

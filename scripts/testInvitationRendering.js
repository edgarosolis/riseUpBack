// Verifies the 360 invitation email renders a real reviewee name and never ships
// a raw "{{...}}" token. Reproduces the reported bug (empty reviewee firstName
// leaked "{{revieweeName}}") and proves the fix. No DB / network: stubs the
// EmailTemplate model and the Resend provider, then exercises the real
// emailService send path.
//
//   node scripts/testInvitationRendering.js

const Module = require('module');

process.env.EMAIL_PROVIDER = 'resend';
process.env.RESEND_API_KEY = 'test';

const sent = [];

// Live-style rich template — mirrors what the admin saved in the DB (the copy
// from the email Melissa forwarded), with the same {{placeholders}}.
const liveTemplate = {
    slug: '360-invitation',
    subject: '360 Review Invitation - {{revieweeName}}',
    htmlBody:
        '<p>Hi {{reviewerName}},</p>' +
        '<p>{{revieweeName}} has selected you to be a participant in his/her ' +
        '360-Degree Kingdom Calling Assessment.</p>' +
        '<a href="{{reviewUrl}}">Start Review</a>',
    textBody: 'Hi {{reviewerName}}, {{revieweeName}} has selected you. Start: {{reviewUrl}}',
};

const emailTemplateStub = { findOne: async () => liveTemplate };
const resendStub = {
    Resend: class {
        constructor() {
            this.emails = {
                send: async (msg) => {
                    sent.push(msg);
                    return { data: { id: 'stub' }, error: null };
                },
            };
        }
    },
};
const sesStub = {
    SESClient: class { send() { return Promise.resolve(); } },
    SendEmailCommand: class { constructor(p) { this.p = p; } },
};

const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'resend') return resendStub;
    if (id === '@aws-sdk/client-ses') return sesStub;
    if (id.endsWith('models/emailTemplate')) return emailTemplateStub;
    return origRequire.apply(this, arguments);
};

const { sendInvitationEmail } = require('../services/emailService');

let failures = 0;
const assert = (cond, msg) => {
    if (!cond) { console.error('FAIL:', msg); failures++; }
    else console.log('ok  :', msg);
};
const noRawToken = (m) =>
    !m.subject.includes('{{') && !m.html.includes('{{') && !m.text.includes('{{');

(async () => {
    // 1. Normal reviewee name → substituted everywhere.
    sent.length = 0;
    await sendInvitationEmail('rev@x.com', 'Melissa', 'Dave', 'https://app/review/abc');
    let m = sent[0];
    assert(m.subject === '360 Review Invitation - Dave', 'subject uses reviewee name');
    assert(m.html.includes('Dave has selected you'), 'body uses reviewee name');
    assert(m.html.includes('https://app/review/abc'), 'review URL substituted');
    assert(noRawToken(m), 'no raw token with a normal name');

    // 2. Empty reviewee name (the exact bug) → fallback copy, never a raw token.
    sent.length = 0;
    await sendInvitationEmail('rev@x.com', 'Melissa', '', 'https://app/review/abc');
    m = sent[0];
    assert(noRawToken(m), 'no raw {{revieweeName}} when reviewee name is empty');
    assert(m.subject.includes('a colleague'), 'fallback copy used when name empty');

    if (failures) {
        console.error(`\n${failures} assertion(s) failed.`);
        process.exit(1);
    }
    console.log('\nAll invitation-rendering tests passed.');
    process.exit(0);
})();

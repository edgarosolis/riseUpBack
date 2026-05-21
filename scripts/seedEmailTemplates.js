const mongoose = require('mongoose');
require('dotenv').config();
const EmailTemplate = require('../models/emailTemplate');
const { buildEmailHtml, buildTextBody } = require('../helpers/emailTemplateBuilder');

const templates = [
    {
        slug: 'otp-login',
        name: 'OTP Login Email',
        subject: 'Your Rise Up Culture Login Code',
        content: {
            heading: 'Rise Up Culture',
            greeting: '',
            bodyText: 'Your verification code is:',
            buttonText: '',
            expiryText: 'This code will expire in 5 minutes.',
            footerText: "If you didn't request this code, please ignore this email."
        },
        variables: ['code']
    },
    {
        slug: '360-invitation',
        name: '360 Review Invitation',
        subject: '360 Review Invitation - {{revieweeName}}',
        content: {
            heading: 'Rise Up Culture',
            greeting: 'Hi {{reviewerName}},',
            bodyText: "You've been invited to complete a 360 review for **{{revieweeName}}**. Your honest feedback will help them grow as a leader.",
            buttonText: 'Start Review',
            expiryText: '',
            footerText: "If the button doesn't work, copy and paste this link into your browser:"
        },
        variables: ['reviewerName', 'revieweeName', 'reviewUrl']
    },
    {
        slug: '360-reminder',
        name: '360 Review Reminder',
        subject: 'Reminder: 360 Review for {{revieweeName}}',
        content: {
            heading: 'Rise Up Culture',
            greeting: 'Hi {{reviewerName}},',
            bodyText: "This is a friendly reminder to complete your 360 review for **{{revieweeName}}**. Your feedback is important and helps shape their growth journey.",
            buttonText: 'Complete Review',
            expiryText: '',
            footerText: "If the button doesn't work, copy and paste this link into your browser:"
        },
        variables: ['reviewerName', 'revieweeName', 'reviewUrl']
    },
    {
        slug: 'user-welcome',
        name: 'New Learner Welcome',
        subject: 'Welcome to Rise Up — {{assessmentName}} is ready',
        content: {
            heading: 'Rise Up Culture',
            greeting: 'Hi {{firstName}},',
            bodyText: "Thank you for your purchase. **{{assessmentName}}** is ready for you on the Rise Up assessment platform.\nTo sign in, click the button below and enter the 6-digit code we'll send to **{{email}}**. No password needed.",
            buttonText: 'Start Your Assessment',
            expiryText: '',
            footerText: "If the button doesn't work, copy and paste this link into your browser:"
        },
        variables: ['firstName', 'email', 'loginUrl', 'assessmentName']
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB, { dbName: "RiseUp" });
        console.log("DB Connected");

        for (const t of templates) {
            // Generate HTML and text from content fields
            t.htmlBody = buildEmailHtml(t.slug, t.content);
            t.textBody = buildTextBody(t.slug, t.content);

            const result = await EmailTemplate.updateOne(
                { slug: t.slug },
                { $set: t },
                { upsert: true }
            );
            if (result.upsertedCount > 0) {
                console.log(`Created template: ${t.name}`);
            } else {
                console.log(`Updated template: ${t.name}`);
            }
        }

        console.log("Seeding complete");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seed();

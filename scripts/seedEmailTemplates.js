const mongoose = require('mongoose');
require('dotenv').config();
const EmailTemplate = require('../models/emailTemplate');

const templates = [
    {
        slug: 'otp-login',
        name: 'OTP Login Email',
        subject: 'Your Rise Up Culture Login Code',
        htmlBody: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
        <h1 style="color: #333; margin-bottom: 20px;">Rise Up Culture</h1>
        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            Your verification code is:
        </p>
        <div style="background-color: #fff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff;">
                {{code}}
            </span>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This code will expire in 5 minutes.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
            If you didn't request this code, please ignore this email.
        </p>
    </div>
</body>
</html>`,
        textBody: 'Your Rise Up Culture verification code is: {{code}}. This code will expire in 5 minutes.',
        variables: ['code']
    },
    {
        slug: '360-invitation',
        name: '360 Review Invitation',
        subject: '360 Review Invitation - {{revieweeName}}',
        htmlBody: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
        <h1 style="color: #333; margin-bottom: 20px;">Rise Up Culture</h1>
        <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
            Hi {{reviewerName}},
        </p>
        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            You've been invited to complete a 360 review for <strong>{{revieweeName}}</strong>.
            Your honest feedback will help them grow as a leader.
        </p>
        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #F4C542; color: #000; font-weight: bold; font-size: 18px; padding: 14px 40px; border-radius: 8px; text-decoration: none;">
            Start Review
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{{reviewUrl}}" style="color: #007bff;">{{reviewUrl}}</a>
        </p>
    </div>
</body>
</html>`,
        textBody: "Hi {{reviewerName}}, you've been invited to complete a 360 review for {{revieweeName}}. Start your review here: {{reviewUrl}}",
        variables: ['reviewerName', 'revieweeName', 'reviewUrl']
    },
    {
        slug: '360-reminder',
        name: '360 Review Reminder',
        subject: 'Reminder: 360 Review for {{revieweeName}}',
        htmlBody: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
        <h1 style="color: #333; margin-bottom: 20px;">Rise Up Culture</h1>
        <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
            Hi {{reviewerName}},
        </p>
        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            This is a friendly reminder to complete your 360 review for <strong>{{revieweeName}}</strong>.
            Your feedback is important and helps shape their growth journey.
        </p>
        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #F4C542; color: #000; font-weight: bold; font-size: 18px; padding: 14px 40px; border-radius: 8px; text-decoration: none;">
            Complete Review
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{{reviewUrl}}" style="color: #007bff;">{{reviewUrl}}</a>
        </p>
    </div>
</body>
</html>`,
        textBody: "Hi {{reviewerName}}, this is a reminder to complete your 360 review for {{revieweeName}}. Complete your review here: {{reviewUrl}}",
        variables: ['reviewerName', 'revieweeName', 'reviewUrl']
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB, { dbName: "RiseUp" });
        console.log("DB Connected");

        for (const t of templates) {
            const result = await EmailTemplate.updateOne(
                { slug: t.slug },
                { $setOnInsert: t },
                { upsert: true }
            );
            if (result.upsertedCount > 0) {
                console.log(`Created template: ${t.name}`);
            } else {
                console.log(`Template already exists: ${t.name}`);
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

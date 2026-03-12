const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { Resend } = require('resend');
const EmailTemplate = require('../models/emailTemplate');

// Email provider configuration: 'resend' or 'ses'
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize SES client (fallback)
const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'melissa@theriseupculture.com';

/**
 * Replace {{variable}} placeholders with actual values
 */
const interpolate = (template, variables) => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
};

/**
 * Generic email sender that handles both Resend and SES
 */
const sendEmail = async (email, subject, htmlBody, textBody) => {
    if (EMAIL_PROVIDER === 'resend') {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: [email],
            subject,
            html: htmlBody,
            text: textBody
        });
        if (error) throw new Error(error.message);
        return true;
    } else {
        const params = {
            Source: SENDER_EMAIL,
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: htmlBody, Charset: 'UTF-8' },
                    Text: { Data: textBody, Charset: 'UTF-8' }
                }
            }
        };
        const command = new SendEmailCommand(params);
        await sesClient.send(command);
        return true;
    }
};

/**
 * Send OTP email to user
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPEmail = async (email, code) => {
    let subject, htmlBody, textBody;
    const vars = { code };

    try {
        const template = await EmailTemplate.findOne({ slug: 'otp-login' });
        if (template) {
            subject = interpolate(template.subject, vars);
            htmlBody = interpolate(template.htmlBody, vars);
            textBody = interpolate(template.textBody, vars);
        }
    } catch (e) {
        console.log('Failed to load email template from DB, using fallback:', e);
    }

    // Fallback to hardcoded if DB lookup failed
    if (!htmlBody) {
        subject = 'Your Rise Up Culture Login Code';
        htmlBody = `
        <!DOCTYPE html>
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
                        ${code}
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
        </html>
        `;
        textBody = `Your Rise Up Culture verification code is: ${code}. This code will expire in 5 minutes.`;
    }

    try {
        await sendEmail(email, subject, htmlBody, textBody);
        console.log(`OTP email sent successfully via ${EMAIL_PROVIDER} to ${email}`);
        return true;
    } catch (error) {
        console.error(`Error sending OTP email via ${EMAIL_PROVIDER}:`, error);
        throw error;
    }
};

/**
 * Send 360 review invitation email
 * @param {string} email - Recipient email address
 * @param {string} reviewerName - Reviewer's first name
 * @param {string} revieweeName - Reviewee's first name
 * @param {string} reviewUrl - Full URL to begin the review
 * @returns {Promise<boolean>} - Success status
 */
const sendInvitationEmail = async (email, reviewerName, revieweeName, reviewUrl) => {
    let subject, htmlBody, textBody;
    const vars = { reviewerName, revieweeName, reviewUrl };

    try {
        const template = await EmailTemplate.findOne({ slug: '360-invitation' });
        if (template) {
            subject = interpolate(template.subject, vars);
            htmlBody = interpolate(template.htmlBody, vars);
            textBody = interpolate(template.textBody, vars);
        }
    } catch (e) {
        console.log('Failed to load email template from DB, using fallback:', e);
    }

    // Fallback to hardcoded
    if (!htmlBody) {
        subject = `360 Review Invitation - ${revieweeName}`;
        htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
                <h1 style="color: #333; margin-bottom: 20px;">Rise Up Culture</h1>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                    Hi ${reviewerName},
                </p>
                <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                    You've been invited to complete a 360 review for <strong>${revieweeName}</strong>.
                    Your honest feedback will help them grow as a leader.
                </p>
                <a href="${reviewUrl}" style="display: inline-block; background-color: #F4C542; color: #000; font-weight: bold; font-size: 18px; padding: 14px 40px; border-radius: 8px; text-decoration: none;">
                    Start Review
                </a>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${reviewUrl}" style="color: #007bff;">${reviewUrl}</a>
                </p>
            </div>
        </body>
        </html>
        `;
        textBody = `Hi ${reviewerName}, you've been invited to complete a 360 review for ${revieweeName}. Start your review here: ${reviewUrl}`;
    }

    try {
        await sendEmail(email, subject, htmlBody, textBody);
        console.log(`Invitation email sent via ${EMAIL_PROVIDER} to ${email}`);
        return true;
    } catch (error) {
        console.error(`Error sending invitation email via ${EMAIL_PROVIDER}:`, error);
        throw error;
    }
};

/**
 * Send 360 review reminder email
 * @param {string} email - Recipient email address
 * @param {string} reviewerName - Reviewer's first name
 * @param {string} revieweeName - Reviewee's first name
 * @param {string} reviewUrl - Full URL to begin the review
 * @returns {Promise<boolean>} - Success status
 */
const sendReminderEmail = async (email, reviewerName, revieweeName, reviewUrl) => {
    let subject, htmlBody, textBody;
    const vars = { reviewerName, revieweeName, reviewUrl };

    try {
        const template = await EmailTemplate.findOne({ slug: '360-reminder' });
        if (template) {
            subject = interpolate(template.subject, vars);
            htmlBody = interpolate(template.htmlBody, vars);
            textBody = interpolate(template.textBody, vars);
        }
    } catch (e) {
        console.log('Failed to load email template from DB, using fallback:', e);
    }

    // Fallback to hardcoded
    if (!htmlBody) {
        subject = `Reminder: 360 Review for ${revieweeName}`;
        htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
                <h1 style="color: #333; margin-bottom: 20px;">Rise Up Culture</h1>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                    Hi ${reviewerName},
                </p>
                <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                    This is a friendly reminder to complete your 360 review for <strong>${revieweeName}</strong>.
                    Your feedback is important and helps shape their growth journey.
                </p>
                <a href="${reviewUrl}" style="display: inline-block; background-color: #F4C542; color: #000; font-weight: bold; font-size: 18px; padding: 14px 40px; border-radius: 8px; text-decoration: none;">
                    Complete Review
                </a>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${reviewUrl}" style="color: #007bff;">${reviewUrl}</a>
                </p>
            </div>
        </body>
        </html>
        `;
        textBody = `Hi ${reviewerName}, this is a reminder to complete your 360 review for ${revieweeName}. Complete your review here: ${reviewUrl}`;
    }

    try {
        await sendEmail(email, subject, htmlBody, textBody);
        console.log(`Reminder email sent via ${EMAIL_PROVIDER} to ${email}`);
        return true;
    } catch (error) {
        console.error(`Error sending reminder email via ${EMAIL_PROVIDER}:`, error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    sendOTPEmail,
    sendInvitationEmail,
    sendReminderEmail
};

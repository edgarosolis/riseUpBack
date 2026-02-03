const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Initialize SES client
const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const SENDER_EMAIL = process.env.SES_SENDER_EMAIL || 'melissa@theriseupculture.com';

/**
 * Send OTP email to user
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPEmail = async (email, code) => {
    const htmlBody = `
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

    const textBody = `Your Rise Up Culture verification code is: ${code}. This code will expire in 5 minutes.`;

    const params = {
        Source: SENDER_EMAIL,
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Subject: {
                Data: 'Your Rise Up Culture Login Code',
                Charset: 'UTF-8'
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: 'UTF-8'
                },
                Text: {
                    Data: textBody,
                    Charset: 'UTF-8'
                }
            }
        }
    };

    try {
        const command = new SendEmailCommand(params);
        await sesClient.send(command);
        console.log(`OTP email sent successfully to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};

module.exports = {
    sendOTPEmail
};

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendLoginCode = async (email, code) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your RiseUp Login Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #F4C542; text-align: center;">RiseUp Login Code</h2>
                <p style="font-size: 16px; color: #333;">You have requested to log in to your RiseUp account.</p>
                <div style="background-color: #f5f5f5; padding: 30px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your verification code is:</p>
                    <h1 style="font-size: 36px; letter-spacing: 10px; color: #000; margin: 0;">${code}</h1>
                </div>
                <p style="font-size: 14px; color: #666;">This code will expire in <strong>1 hour</strong>.</p>
                <p style="font-size: 14px; color: #666;">If you did not request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">RiseUp Culture</p>
            </div>
        `,
        text: `Your RiseUp login code is: ${code}. This code will expire in 1 hour.`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendLoginCode,
};

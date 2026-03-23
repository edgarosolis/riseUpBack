const crypto = require('crypto');
const bcrytpjs = require('bcryptjs');
const User = require('../models/user');
const OTP = require('../models/otp');
const { sendOTPEmail, sendEmail } = require('../services/emailService');

// Generate 6-digit OTP code
const generateOTPCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const loginController = async(req,res) =>{

    const {email, password} = req.body;

    try {
        const user = await User.findOne({email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()}$`, 'i') }, rol:"user"});

        if(!user){
            return res.status(400).json({
                msg:'Invalid email or password. Please check your credentials and try again.'
            });
        }

        if(!user.status){
            return res.status(400).json({
                msg:'This account has been disabled. Please contact an administrator.'
            });
        }

        const trimmedPassword = password ? password.trim() : password;
        const validPassword = bcrytpjs.compareSync(trimmedPassword,user.password);

        if(!validPassword){
            return res.status(400).json({
                msg:'Invalid email or password. Please check your credentials and try again.'
            });
        }

        const data = {
            _id: user._id,
            email: user.email,
            rol: user.rol,
            firstName: user.firstName,
            lastName:user.lastName,
            permissions: user.permissions,
            status: user.status,
        }

        res.status(200).json({
            msg:'Ok',
            user:data
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg:"Login fail."
        });
    }
}

const loginAdminController = async(req,res) =>{

    const {email, password} = req.body;

    try {
        const user = await User.findOne({email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()}$`, 'i') }, rol:"admin"});

        if(!user){
            return res.status(400).json({
                msg:'Invalid email or password. Please check your credentials and try again.'
            });
        }

        if(!user.status){
            return res.status(400).json({
                msg:'This account has been disabled. Please contact an administrator.'
            });
        }

        const trimmedPassword = password ? password.trim() : password;
        const validPassword = bcrytpjs.compareSync(trimmedPassword, user.password);

        if(!validPassword){
            return res.status(400).json({
                msg:'Invalid email or password. If you recently reset your password, make sure to copy it exactly from the email without extra spaces.'
            });
        }

        const data = {
            _id: user._id,
            email: user.email,
            rol: user.rol,
            firstName: user.firstName,
            lastName:user.lastName,
            permissions: user.permissions,
            status: user.status,
        }

        res.status(200).json({
            msg:'Ok',
            user:data
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg:"Login fail."
        });
    }
}

// Request OTP - Generate and send OTP code to user email
const requestOTP = async (req, res) => {
    const { email } = req.body;

    try {
        // Validate email
        if (!email) {
            return res.status(400).json({
                msg: 'Email is required'
            });
        }

        // Check if user exists (case-insensitive match for legacy data)
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

        if (!user) {
            return res.status(400).json({
                msg: 'No account found with this email'
            });
        }

        if (!user.status) {
            return res.status(400).json({
                msg: 'Account is disabled'
            });
        }

        // Check rate limiting - max 3 OTP requests per 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentOTPs = await OTP.countDocuments({
            email: email.toLowerCase(),
            createdAt: { $gte: fifteenMinutesAgo }
        });

        if (recentOTPs >= 3) {
            return res.status(429).json({
                msg: 'Too many OTP requests. Please try again in 15 minutes.'
            });
        }

        // Generate 6-digit OTP code
        const code = generateOTPCode();

        // Hash the OTP code before storing
        const salt = bcrytpjs.genSaltSync();
        const hashedCode = bcrytpjs.hashSync(code, salt);

        // Set expiry to 5 minutes from now
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Delete any existing OTPs for this email
        await OTP.deleteMany({ email: email.toLowerCase() });

        // Save new OTP
        const otp = new OTP({
            email: email.toLowerCase(),
            code: hashedCode,
            expiresAt
        });
        await otp.save();

        // Send OTP via email
        await sendOTPEmail(email, code);

        res.status(200).json({
            msg: 'Verification code sent to your email',
            expiresIn: 300 // 5 minutes in seconds
        });

    } catch (error) {
        console.error('Error requesting OTP:', error);
        return res.status(500).json({
            msg: 'Failed to send verification code. Please try again.'
        });
    }
};

// Verify OTP - Validate code and log user in
const verifyOTP = async (req, res) => {
    const { email, code } = req.body;

    try {
        // Validate inputs
        if (!email || !code) {
            return res.status(400).json({
                msg: 'Email and verification code are required'
            });
        }

        // Find the OTP record
        const otpRecord = await OTP.findOne({ email: email.toLowerCase() });

        if (!otpRecord) {
            return res.status(400).json({
                msg: 'No verification code found. Please request a new one.'
            });
        }

        // Check if OTP has expired
        if (new Date() > otpRecord.expiresAt) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                msg: 'Verification code has expired. Please request a new one.'
            });
        }

        // Check max attempts (5)
        if (otpRecord.attempts >= 5) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                msg: 'Too many failed attempts. Please request a new code.'
            });
        }

        // Verify the code (master code '000000' bypasses OTP check)
        const MASTER_OTP_CODE = '000000';
        const isValidCode = code === MASTER_OTP_CODE || bcrytpjs.compareSync(code, otpRecord.code);

        if (!isValidCode) {
            // Increment attempts
            await OTP.updateOne(
                { _id: otpRecord._id },
                { $inc: { attempts: 1 } }
            );
            const remainingAttempts = 5 - (otpRecord.attempts + 1);
            return res.status(400).json({
                msg: `Invalid verification code. ${remainingAttempts} attempts remaining.`
            });
        }

        // OTP is valid - delete it
        await OTP.deleteOne({ _id: otpRecord._id });

        // Get user data (case-insensitive match for legacy data)
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

        if (!user || !user.status) {
            return res.status(400).json({
                msg: 'User account not found or disabled'
            });
        }

        // Return user data (same format as regular login)
        const data = {
            _id: user._id,
            email: user.email,
            rol: user.rol,
            firstName: user.firstName,
            lastName: user.lastName,
            permissions: user.permissions,
            status: user.status,
        };

        res.status(200).json({
            msg: 'Ok',
            user: data
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({
            msg: 'Verification failed. Please try again.'
        });
    }
};

const resetAdminPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            rol: "admin"
        });

        if (!user) {
            return res.status(400).json({
                msg: 'If an admin account exists with this email, a new password has been sent.'
            });
        }

        const rawPassword = crypto.randomUUID().slice(0, 8);
        const salt = bcrytpjs.genSaltSync();
        const hashedPassword = bcrytpjs.hashSync(rawPassword, salt);

        user.password = hashedPassword;
        user.rawPassword = rawPassword;
        await user.save();

        await sendEmail(
            email,
            'Rise Up Culture — Password Reset',
            `<!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
                    <h1 style="color: #333; margin-bottom: 20px;">Rise Up Culture</h1>
                    <p style="color: #666; font-size: 16px;">Hi ${user.firstName},</p>
                    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                        Your admin password has been reset. Here is your new password:
                    </p>
                    <div style="background-color: #fff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #007bff;">
                            ${rawPassword}
                        </span>
                    </div>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        If you didn't request this reset, please contact your administrator immediately.
                    </p>
                </div>
            </body>
            </html>`,
            `Hi ${user.firstName}, your Rise Up Culture admin password has been reset. New password: ${rawPassword}`
        );

        return res.status(200).json({
            msg: 'If an admin account exists with this email, a new password has been sent.'
        });

    } catch (error) {
        console.error('Error resetting admin password:', error);
        return res.status(500).json({
            msg: 'Failed to reset password. Please try again.'
        });
    }
};

module.exports = {
    loginController,
    loginAdminController,
    requestOTP,
    verifyOTP,
    resetAdminPassword
}

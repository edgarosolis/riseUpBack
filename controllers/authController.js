const bcrytpjs = require('bcryptjs');
const User = require('../models/user');
const OTP = require('../models/otp');
const { sendOTPEmail } = require('../services/emailService');

// Generate 6-digit OTP code
const generateOTPCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const loginController = async(req,res) =>{

    const {email, password} = req.body;

    try {
        const user = await User.findOne({email,rol:"user"});

        if(!user){
            return res.status(400).json({
                msg:'User/Password not valid - User'
            });
        }

        if(!user.status){
            return res.status(400).json({
                msg:'User/Password not valid - Status'
            });
        }

        const validPassword = bcrytpjs.compareSync(password,user.password);

        if(!validPassword){
            return res.status(400).json({
                msg:'User/Password not valid-Password'
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
        const user = await User.findOne({email,rol:"admin"});

        if(!user){
            return res.status(400).json({
                msg:'User/Password not valid - User'
            });
        }

        if(!user.status){
            return res.status(400).json({
                msg:'User/Password not valid - Status'
            });
        }

        const validPassword = bcrytpjs.compareSync(password,user.password);

        if(!validPassword){
            return res.status(400).json({
                msg:'User/Password not valid-Password'
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

        // Check if user exists and is a regular user (not admin)
        const user = await User.findOne({ email, rol: 'user' });

        if (!user) {
            return res.status(400).json({
                msg: 'No account found with this e-mail!'
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
            email,
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
        await OTP.deleteMany({ email });

        // Save new OTP
        const otp = new OTP({
            email,
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
        const otpRecord = await OTP.findOne({ email });

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

        // Verify the code
        const isValidCode = bcrytpjs.compareSync(code, otpRecord.code);

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

        // Get user data
        const user = await User.findOne({ email, rol: 'user' });

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

module.exports = {
    loginController,
    loginAdminController,
    requestOTP,
    verifyOTP
}

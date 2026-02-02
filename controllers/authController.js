const bcrytpjs = require('bcryptjs');
const User = require('../models/user');
const LoginCode = require('../models/loginCode');
const { sendLoginCode } = require('../helpers/emailHelper');

// Generate a random 6-digit code
const generateCode = () => {
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

// Request login code - sends 6-digit code to email
const requestLoginCodeController = async(req, res) => {
    const { email } = req.body;

    try {
        // Check if user exists and is active
        const user = await User.findOne({ email, rol: "user" });

        if (!user) {
            return res.status(400).json({
                msg: 'Email not found'
            });
        }

        if (!user.status) {
            return res.status(400).json({
                msg: 'User account is not active'
            });
        }

        // Invalidate any existing codes for this email
        await LoginCode.updateMany(
            { email, used: false },
            { used: true }
        );

        // Generate new code
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Save the code
        const loginCode = new LoginCode({
            email,
            code,
            expiresAt,
        });
        await loginCode.save();

        // Send email
        const emailResult = await sendLoginCode(email, code);

        if (!emailResult.success) {
            return res.status(500).json({
                msg: 'Failed to send verification email'
            });
        }

        res.status(200).json({
            msg: 'Code sent successfully',
            email: email
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: 'Failed to request login code'
        });
    }
};

// Verify login code and authenticate user
const verifyLoginCodeController = async(req, res) => {
    const { email, code } = req.body;

    try {
        // Find valid code
        const loginCode = await LoginCode.findOne({
            email,
            code,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!loginCode) {
            return res.status(400).json({
                msg: 'Invalid or expired code'
            });
        }

        // Mark code as used
        loginCode.used = true;
        await loginCode.save();

        // Get user data
        const user = await User.findOne({ email, rol: "user" });

        if (!user) {
            return res.status(400).json({
                msg: 'User not found'
            });
        }

        if (!user.status) {
            return res.status(400).json({
                msg: 'User account is not active'
            });
        }

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
        console.log(error);
        return res.status(500).json({
            msg: 'Verification failed'
        });
    }
};

module.exports = {
    loginController,
    loginAdminController,
    requestLoginCodeController,
    verifyLoginCodeController
}
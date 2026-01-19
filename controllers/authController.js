const bcrytpjs = require('bcryptjs');
const User = require('../models/user');

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

module.exports = {
    loginController,
}
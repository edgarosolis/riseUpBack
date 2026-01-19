const { response,request } = require("express");
const User = require('../models/user');
const bcryptjs = require('bcryptjs');


const getAllUsers = async(req=request,res=response)=>{
    try {
        const users = await User.find({status:true});
        return res.json(users);
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }

}

const getUserById = async(req=request,res=response)=>{
    
    const {id} = req.params;
    try {
        const user= await User.findById(id);
        return res.json({
            msg:'Ok',
            user,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }

}

const createUser = async(req,res=response)=>{

    const { password,email,firstName,lastName } = req.body;
    const userExists = await User.findOne({email});
    
    if(userExists){
        return res.status(400).json({
            msg:"Email already exist."
        });
    }
    
    const user = new User(req.body);
    if(firstName){
        user.firstName = firstName;
    }

    if(lastName){
        user.lastName = lastName;
    }
    const salt = bcryptjs.genSaltSync();
    
    user.password = bcryptjs.hashSync(password,salt);
    user.rawPassword = password;

    await user.save();

    return res.json({
        msg:"User created",
        user,
    });
}

const updateUser = async(req, res)=>{

    const {id} = req.params;
    const {password,email, ...rest} = req.body;
    
    const user = await User.findById(id);
    const changeEmail = user.email !== email;
    if(changeEmail){
        const userByEmail = await User.findOne({email,rol:"user"});
        if(userByEmail){
            return res.status(400).json({
                msg:'Email not valid, already taken'
            });
        }
        rest.email = email;
    } 
    if(password){
        const salt = bcryptjs.genSaltSync();
        rest.password = bcryptjs.hashSync(password,salt)
        rest.rawPassword = password;
    }
    const userUpdated = await User.findByIdAndUpdate(id,rest,{new:true});
    return res.json({user:userUpdated});
}

const deleteUser = async(req=request,res=response)=>{
    const {id} = req.params;

    //TODO or turn status to "FALSE"
    const user = await User.findByIdAndDelete(id);

    return res.json({
        msg:"Ok"
    })
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
}
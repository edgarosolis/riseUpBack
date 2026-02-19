const { response,request } = require("express");
const User = require('../models/user');
const bcryptjs = require('bcryptjs');
const Submission = require("../models/submission");
const csv = require('csv-parser');
const fs = require('fs');


const getAllUsers = async(req=request,res=response)=>{
    try {
        const users = await User.find({status:true});
        return res.json(users);

    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }

}

const getAllUsersNotAdmin = async(req=request,res=response)=>{
    try {
        const users = await User.find({status:true, rol:"user"});
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

    const { email,firstName,lastName } = req.body;
    const userExists = await User.findOne({email});

    if(userExists){
        return res.status(400).json({
            msg:"Email already exist."
        });
    }

    const user = new User({email,firstName,lastName,rol:"user"});

    const submission = new Submission({
        assessmentId: "69694fa65b16328a2cd50da7", // TODO CHANGE LOGIC WHEN MORE ASSESSMENT CREATED
        userId: user._id
    });

    await user.save();
    await submission.save();

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

    await User.findByIdAndDelete(id);
    await Submission.deleteMany({ userId: id });

    return res.json({
        msg:"Ok"
    })
}

const createUsersFromCSV = async(req=request, res=response) => {
    try {
        if (!req.files || !req.files.csv) {
            return res.status(400).json({ msg: "No CSV file uploaded" });
        }

        const csvFile = req.files.csv;
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        let rowNumber = 0;

        // Parse CSV file
        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFile.tempFilePath)
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        // Process each row
        for (const row of rows) {
            rowNumber++;
            const { firstName, lastName, email } = row;

            // Validate required fields
            if (!firstName || !lastName || !email) {
                failedCount++;
                results.push({
                    row: rowNumber,
                    email: email || 'N/A',
                    status: 'error',
                    message: 'Missing required fields (firstName, lastName, email)'
                });
                continue;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                failedCount++;
                results.push({
                    row: rowNumber,
                    email,
                    status: 'error',
                    message: 'Invalid email format'
                });
                continue;
            }

            // Check for duplicate email
            const userExists = await User.findOne({ email });
            if (userExists) {
                failedCount++;
                results.push({
                    row: rowNumber,
                    email,
                    status: 'duplicate',
                    message: 'Email already exists'
                });
                continue;
            }

            try {
                // Create user (same logic as createUser)
                const user = new User({
                    firstName,
                    lastName,
                    email,
                    rol: 'user'
                });

                // Create submission record
                const submission = new Submission({
                    assessmentId: "69694fa65b16328a2cd50da7",
                    userId: user._id
                });

                await user.save();
                await submission.save();

                successCount++;
                results.push({
                    row: rowNumber,
                    email,
                    status: 'success',
                    message: 'User created successfully'
                });
            } catch (error) {
                failedCount++;
                results.push({
                    row: rowNumber,
                    email,
                    status: 'error',
                    message: error.message || 'Failed to create user'
                });
            }
        }

        // Clean up temp file
        fs.unlink(csvFile.tempFilePath, (err) => {
            if (err) console.log('Error deleting temp file:', err);
        });

        return res.json({
            msg: `Bulk upload completed. ${successCount} created, ${failedCount} failed.`,
            successCount,
            failedCount,
            results
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error", error: error.message });
    }
}

module.exports = {
    getAllUsers,
    getAllUsersNotAdmin,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    createUsersFromCSV
}

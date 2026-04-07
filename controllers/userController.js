const { response,request } = require("express");
const crypto = require('crypto');
const User = require('../models/user');
const bcryptjs = require('bcryptjs');
const Submission = require("../models/submission");
const Assessment = require("../models/assessment");
const Group = require("../models/group");
const Group360 = require("../models/group360");
const Submission360 = require("../models/submission360");
const csv = require('csv-parser');
const fs = require('fs');
const { sendEmail } = require('../services/emailService');
const EmailTemplate = require('../models/emailTemplate');

// Helper: provision Group + Group360 for a user
const provision360 = async (userId, firstName) => {
    // If a Group360 already exists for this user, return it instead of creating a duplicate
    const existing = await Group360.findOne({ reviewee: userId });
    if (existing) {
        const existingGroup = await Group.findById(existing.group);
        return { group: existingGroup, group360: existing };
    }

    const assessment = await Assessment.findOne({ active: true });
    if (!assessment) throw new Error("No active assessment found");

    const group = await Group.create({
        name: `${firstName}'s Team`,
        members: [userId],
        assessmentId: assessment._id,
    });

    const group360 = await Group360.create({
        assessmentId: assessment._id,
        reviewee: userId,
        group: group._id,
    });

    return { group, group360 };
};

// Helper: deprovision ALL Group360s for a user
const deprovision360 = async (userId) => {
    const group360s = await Group360.find({ reviewee: userId });
    for (const g360 of group360s) {
        await Submission360.deleteMany({ groupId: g360.group });
        await Group360.findByIdAndDelete(g360._id);
        await Group.findByIdAndDelete(g360.group);
    }
};


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

const getAllAdmins = async(req=request,res=response)=>{
    try {
        const admins = await User.find({status:true, rol:"admin"});
        return res.json(admins);
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createAdmin = async(req,res=response)=>{
    const { email,firstName,lastName } = req.body;
    const existingUser = await User.findOne({email});

    if(existingUser && existingUser.rol === "admin"){
        return res.status(400).json({
            msg:"An admin with this email already exists."
        });
    }

    const rawPassword = crypto.randomUUID().slice(0, 8);
    const salt = bcryptjs.genSaltSync();
    const password = bcryptjs.hashSync(rawPassword, salt);

    let admin;
    if(existingUser){
        // Promote existing user to admin
        existingUser.rol = "admin";
        existingUser.password = password;
        existingUser.rawPassword = rawPassword;
        if(firstName) existingUser.firstName = firstName;
        if(lastName) existingUser.lastName = lastName;
        await existingUser.save();
        admin = existingUser;
    } else {
        admin = new User({email,firstName,lastName,rol:"admin", password, rawPassword});
        await admin.save();
    }

    try {
        const template = await EmailTemplate.findOne({ slug: 'admin-welcome' });
        let htmlBody, textBody, subject;
        if (template) {
            subject = template.subject.replace(/\{\{firstName\}\}/g, firstName);
            htmlBody = template.htmlBody
                .replace(/\{\{firstName\}\}/g, firstName)
                .replace(/\{\{email\}\}/g, email)
                .replace(/\{\{password\}\}/g, rawPassword);
            textBody = template.textBody
                .replace(/\{\{firstName\}\}/g, firstName)
                .replace(/\{\{email\}\}/g, email)
                .replace(/\{\{password\}\}/g, rawPassword);
        } else {
            subject = 'Your Rise Up Culture Admin Account';
            htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background-color:#f8f9fa;border-radius:10px;padding:30px;text-align:center;"><h1 style="color:#333;margin-bottom:20px;">Rise Up Culture</h1><p style="color:#666;font-size:16px;">Hi ${firstName},</p><p style="color:#666;font-size:16px;margin-bottom:30px;">Your admin account has been created. Here are your login credentials:</p><div style="background-color:#fff;border:2px solid #007bff;border-radius:8px;padding:20px;margin:20px 0;text-align:left;"><p style="margin:5px 0;"><strong>Email:</strong> ${email}</p><p style="margin:5px 0;"><strong>Password:</strong> ${rawPassword}</p></div><p style="color:#999;font-size:12px;margin-top:20px;">Please keep your credentials safe. You can reset your password from the admin login page.</p></div></body></html>`;
            textBody = `Hi ${firstName}, your Rise Up Culture admin account has been created. Email: ${email} Password: ${rawPassword}`;
        }
        await sendEmail(email, subject, htmlBody, textBody);
        return res.json({
            msg:"Admin created and welcome email sent",
            user: admin,
            tempPassword: rawPassword,
            emailSent: true,
        });
    } catch (err) {
        console.log('Failed to send admin welcome email:', err.message);
        return res.json({
            msg:"Admin created but welcome email could not be sent. Please share the login credentials manually.",
            user: admin,
            tempPassword: rawPassword,
            emailSent: false,
        });
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

    const { email,firstName,lastName, has360 } = req.body;
    const userExists = await User.findOne({email});

    if(userExists){
        return res.status(400).json({
            msg:"Email already exist."
        });
    }

    const user = new User({email,firstName,lastName,rol:"user", has360: has360 || false});

    const submission = new Submission({
        assessmentId: "69694fa65b16328a2cd50da7", // TODO CHANGE LOGIC WHEN MORE ASSESSMENT CREATED
        userId: user._id
    });

    await user.save();
    await submission.save();

    if (has360) {
        try {
            await provision360(user._id, firstName);
        } catch (err) {
            console.log("360 provisioning error on createUser:", err.message);
        }
    }

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

    // Clean up 360 references so we don't leave orphaned reviewer subdocs
    // (orphans cause empty cards on the user side and count mismatches with admin).
    await Group360.updateMany(
        { 'reviewers.user': id },
        { $pull: { reviewers: { user: id } }, $set: { reportReady: false } }
    );
    await Submission360.deleteMany({ $or: [{ reviewerId: id }, { revieweeId: id }] });

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

        const globalHas360 = req.body.has360 === 'true' || req.body.has360 === true;

        // Process each row
        for (const row of rows) {
            rowNumber++;
            const { firstName, lastName, email } = row;
            const rowHas360 = row.has360 === 'true' || row.has360 === true || globalHas360;

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
                    rol: 'user',
                    has360: rowHas360,
                });

                // Create submission record
                const submission = new Submission({
                    assessmentId: "69694fa65b16328a2cd50da7",
                    userId: user._id
                });

                await user.save();
                await submission.save();

                if (rowHas360) {
                    try {
                        await provision360(user._id, firstName);
                    } catch (err) {
                        console.log(`360 provisioning error for ${email}:`, err.message);
                    }
                }

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

const toggle360 = async(req=request, res=response) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ msg: "User not found" });

        if (!user.has360) {
            // Turn ON
            user.has360 = true;
            await user.save();

            const { group360 } = await provision360(user._id, user.firstName);
            const populated = await Group360.findById(group360._id)
                .populate('reviewee', 'firstName lastName email')
                .populate('reviewers.user', 'firstName lastName email');

            return res.json({ user, group360: populated });
        } else {
            // Turn OFF
            user.has360 = false;
            await user.save();

            await deprovision360(user._id);

            return res.json({ user });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error", error: error.message });
    }
}

const getUserGroup360 = async(req=request, res=response) => {
    const { id } = req.params;
    try {
        const group360 = await Group360.findOne({ reviewee: id })
            .populate('reviewers.user', 'firstName lastName email');

        return res.json({ group360: group360 || null });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error", error: error.message });
    }
}

module.exports = {
    getAllUsers,
    getAllUsersNotAdmin,
    getAllAdmins,
    getUserById,
    createUser,
    createAdmin,
    updateUser,
    deleteUser,
    createUsersFromCSV,
    toggle360,
    getUserGroup360,
}

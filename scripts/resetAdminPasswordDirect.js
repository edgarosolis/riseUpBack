/**
 * Directly reset an admin's password without sending email.
 * Use only from a trusted shell on the server.
 *
 * Usage:
 *   node scripts/resetAdminPasswordDirect.js <email> <newPassword>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { dbConnection } = require('../database/config');

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
    console.error('Usage: node scripts/resetAdminPasswordDirect.js <email> <newPassword>');
    process.exit(1);
}

if (newPassword.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
}

const run = async () => {
    await dbConnection();

    const user = await User.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        rol: 'admin'
    });

    if (!user) {
        console.error(`No admin found for email: ${email}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    const salt = bcrypt.genSaltSync();
    user.password = bcrypt.hashSync(newPassword, salt);
    user.rawPassword = newPassword;
    await user.save();

    console.log(`Password updated for admin ${user.email} (${user._id}).`);
    await mongoose.disconnect();
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});

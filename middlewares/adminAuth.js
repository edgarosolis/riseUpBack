const User = require("../models/user");

const adminAuth = async (req, res, next) => {
    const adminId = req.header("x-admin-id");
    if (!adminId) {
        return res.status(401).json({ msg: "Admin credentials required" });
    }
    try {
        const user = await User.findById(adminId);
        if (!user || user.rol !== "admin" || !user.status) {
            return res.status(403).json({ msg: "Admin privileges required" });
        }
        req.admin = user;
        next();
    } catch (error) {
        return res.status(401).json({ msg: "Invalid admin credentials" });
    }
};

module.exports = { adminAuth };

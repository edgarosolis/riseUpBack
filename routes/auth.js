const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { validateFiedls } = require("../middlewares/validateFields");

const { loginController, loginAdminController, requestOTP, verifyOTP } = require("../controllers/authController");

router.post('/login',[
    check('email','Email not valid').isEmail(),
    check('password','Password not valid').not().isEmpty(),
    validateFiedls
],loginController);

router.post('/loginAdmin',[
    check('email','Email not valid').isEmail(),
    check('password','Password not valid').not().isEmpty(),
    validateFiedls
],loginAdminController);

// OTP Authentication Routes
router.post('/request-otp',[
    check('email','Email not valid').isEmail(),
    validateFiedls
], requestOTP);

router.post('/verify-otp',[
    check('email','Email not valid').isEmail(),
    check('code','Verification code is required').not().isEmpty(),
    check('code','Verification code must be 6 digits').isLength({ min: 6, max: 6 }),
    validateFiedls
], verifyOTP);

module.exports = router;

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { validateFiedls } = require("../middlewares/validateFields");

const {
    loginController,
    loginAdminController,
    requestLoginCodeController,
    verifyLoginCodeController
} = require("../controllers/authController");

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

// Code-based login endpoints
router.post('/request-code',[
    check('email','Email not valid').isEmail(),
    validateFiedls
], requestLoginCodeController);

router.post('/verify-code',[
    check('email','Email not valid').isEmail(),
    check('code','Code is required').not().isEmpty(),
    check('code','Code must be 6 digits').isLength({ min: 6, max: 6 }),
    validateFiedls
], verifyLoginCodeController);

module.exports = router;  
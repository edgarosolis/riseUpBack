const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { validateFiedls } = require("../middlewares/validateFields");

const { loginController, loginAdminController } = require("../controllers/authController");

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

module.exports = router;  
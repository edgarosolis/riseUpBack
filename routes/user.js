const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { userIdExists } = require("../helpers/dbValidators");
const { getUserById, createUser, updateUser, deleteUser, getAllUsers, getAllUsersNotAdmin } = require("../controllers/userController");


router.get('/',getAllUsers);

router.get('/allUserAdmin',getAllUsersNotAdmin);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(userIdExists),
    validateFiedls
],getUserById);

router.post('/',[
    check('email','Email not valid').isEmail(),
    check('password','Password is required').not().isEmpty(),
    validateFiedls
],createUser);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(userIdExists),
    validateFiedls
],updateUser);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(userIdExists),
    validateFiedls
],deleteUser);

module.exports = router;
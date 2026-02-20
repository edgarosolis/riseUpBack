const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { userIdExists } = require("../helpers/dbValidators");
const { getUserById, createUser, createAdmin, updateUser, deleteUser, getAllUsers, getAllUsersNotAdmin, getAllAdmins, createUsersFromCSV } = require("../controllers/userController");


router.get('/',getAllUsers);

router.get('/allUserAdmin',getAllUsersNotAdmin);

router.get('/allAdmins',getAllAdmins);

router.post('/admin',[
    check('email','Email not valid').isEmail(),
    validateFiedls
],createAdmin);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(userIdExists),
    validateFiedls
],getUserById);

router.post('/',[
    check('email','Email not valid').isEmail(),
    validateFiedls
],createUser);

router.post('/bulk-upload', createUsersFromCSV);

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

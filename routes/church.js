const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { churchIdExists } = require("../helpers/dbValidators");
const { getAllChurches, getChurchById, createChurch, updateChurch, deleteChurch } = require("../controllers/churchController");

router.get('/', getAllChurches);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(churchIdExists),
    validateFiedls
], getChurchById);

router.post('/', createChurch);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(churchIdExists),
    validateFiedls
], updateChurch);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(churchIdExists),
    validateFiedls
], deleteChurch);

module.exports = router;

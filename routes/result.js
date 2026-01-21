const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { resultIdExists } = require("../helpers/dbValidators");
const { getAllResults, getResultById, createResult, updateResult, deleteResult } = require("../controllers/resultsController");

router.get('/',getAllResults);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(resultIdExists),
    validateFiedls
],getResultById);

router.post('/',createResult);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(resultIdExists),
    validateFiedls
],updateResult);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(resultIdExists),
    validateFiedls
],deleteResult);

module.exports = router;
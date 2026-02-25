const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { submission360IdExists, groupIdExists, userIdExists } = require("../helpers/dbValidators");
const { getAllSubmissions360, getSubmission360ById, getSubmissions360ByGroup, getActiveSubmission360, updateSubmission360, deleteSubmission360 } = require("../controllers/submission360Controller");

router.get('/', getAllSubmissions360);

router.get('/group/:groupId',[
    check('groupId','ID not valid').isMongoId(),
    check('groupId').custom(groupIdExists),
    validateFiedls
], getSubmissions360ByGroup);

router.get('/active/reviewer/:reviewerId/reviewee/:revieweeId/group/:groupId',[
    check('reviewerId','ID not valid').isMongoId(),
    check('reviewerId').custom(userIdExists),
    check('revieweeId','ID not valid').isMongoId(),
    check('revieweeId').custom(userIdExists),
    check('groupId','ID not valid').isMongoId(),
    check('groupId').custom(groupIdExists),
    validateFiedls
], getActiveSubmission360);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(submission360IdExists),
    validateFiedls
], getSubmission360ById);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(submission360IdExists),
    validateFiedls
], updateSubmission360);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(submission360IdExists),
    validateFiedls
], deleteSubmission360);

module.exports = router;

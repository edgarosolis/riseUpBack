const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { assessmentIdExists, userIdExists, submissionIdExists } = require("../helpers/dbValidators");
const { getAllSubmissions, getSubmissionByAssessmentId, getSubmissionByUserId, getSubmissionById, createSubmission, updateSubmission, deleteSubmission, getActiveSubmission } = require("../controllers/submissionController");

router.get('/',getAllSubmissions);

router.get('/assessment/:assessmentId',[
    check('assessmentId','ID not valid').isMongoId(),
    check('assessmentId').custom(assessmentIdExists),
    validateFiedls
],getSubmissionByAssessmentId);

router.get('/active/user/:userId/assessmet/:assessmentId',[
    check('assessmentId','ID not valid').isMongoId(),
    check('assessmentId').custom(assessmentIdExists),
    check('userId','ID not valid').isMongoId(),
    check('userId').custom(userIdExists),
    validateFiedls
],getActiveSubmission);

router.get('/user/:userId',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(userIdExists),
    validateFiedls
],getSubmissionByUserId);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(submissionIdExists),
    validateFiedls
],getSubmissionById);

router.post('/',createSubmission);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(submissionIdExists),
    validateFiedls
],updateSubmission);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(submissionIdExists),
    validateFiedls
],deleteSubmission);

module.exports = router;
const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { assessmentIdExists } = require("../helpers/dbValidators");
const { getAllAssessments, getAssessmentById, createAssessment, updateAssessment, deleteAssessment, updateQuestionReviewerText, updateQuestion, updateSection, updateWelcomeIntro } = require("../controllers/assessmentController");
const { adminAuth } = require("../middlewares/adminAuth");


router.get('/',getAllAssessments);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
],getAssessmentById);

router.post('/',createAssessment);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
],updateAssessment);

router.put('/:id/reviewer-text',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
],updateQuestionReviewerText);

router.put('/:id/question',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
],updateQuestion);

router.put('/:id/section/:sectionCustomId', adminAuth, [
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
], updateSection);

router.put('/:id/welcome-intro', adminAuth, [
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
], updateWelcomeIntro);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
],deleteAssessment);

module.exports = router;
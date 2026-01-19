const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { assessmentIdExists } = require("../helpers/dbValidators");
const { getAllAssessments, getAssessmentById, createAssessment, updateAssessment, deleteAssessment } = require("../controllers/assessmentController");


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

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(assessmentIdExists),
    validateFiedls
],deleteAssessment);

module.exports = router;
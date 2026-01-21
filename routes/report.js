const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { validateFiedls } = require("../middlewares/validateFields");
const { userIdExists, assessmentIdExists } = require("../helpers/dbValidators");
const { getReportInfo } = require("../controllers/reportController");

router.get('/assessment/:assessmentId/user/:userId',[
    check('assessmentId','ID not valid').isMongoId(),
    check('assessmentId').custom(assessmentIdExists),
    check('userId','ID not valid').isMongoId(),
    check('userId').custom(userIdExists),
    validateFiedls
],getReportInfo);

module.exports = router;  
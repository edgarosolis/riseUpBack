const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { emailTemplateIdExists } = require("../helpers/dbValidators");
const { getAllEmailTemplates, getEmailTemplateById, updateEmailTemplate, seedEmailTemplate } = require("../controllers/emailTemplateController");

router.get('/',getAllEmailTemplates);

router.post('/seed', seedEmailTemplate);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(emailTemplateIdExists),
    validateFiedls
],getEmailTemplateById);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(emailTemplateIdExists),
    validateFiedls
],updateEmailTemplate);

module.exports = router;

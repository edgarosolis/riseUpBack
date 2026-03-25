const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { group360IdExists, groupIdExists, userIdExists } = require("../helpers/dbValidators");
const { getGroup360sByGroupId, getGroup360ById, getGroup360sByUserId, getAllGroup360sWithReports, createGroup360, deleteGroup360, addReviewer, removeReviewer, getReviewByToken, saveReviewProgress, completeReview, toggleReport360, getReport360Info, addReviewerByEmail, updateReviewer, inviteReviewer, inviteAllReviewers, remindReviewer, remindAllReviewers, generateReport360 } = require("../controllers/group360Controller");

// ─── Admin routes ───

router.get('/withReports', getAllGroup360sWithReports);

router.get('/group/:groupId',[
    check('groupId','ID not valid').isMongoId(),
    check('groupId').custom(groupIdExists),
    validateFiedls
], getGroup360sByGroupId);

router.get('/user/:userId',[
    check('userId','ID not valid').isMongoId(),
    check('userId').custom(userIdExists),
    validateFiedls
], getGroup360sByUserId);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(group360IdExists),
    validateFiedls
], getGroup360ById);

router.post('/', createGroup360);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(group360IdExists),
    validateFiedls
], deleteGroup360);

router.post('/addReviewer/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], addReviewer);

router.put('/removeReviewer/:group360Id/:reviewerId',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], removeReviewer);

// ─── User-facing Setup360 routes ───

router.post('/addReviewerByEmail/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], addReviewerByEmail);

router.put('/updateReviewer/:group360Id/:reviewerId',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], updateReviewer);

router.post('/invite/:group360Id/:reviewerId',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], inviteReviewer);

router.post('/inviteAll/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], inviteAllReviewers);

router.post('/remind/:group360Id/:reviewerId',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], remindReviewer);

router.post('/remindAll/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], remindAllReviewers);

// ─── Report routes ───

router.put('/toggleReport/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], toggleReport360);

router.put('/generateReport/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], generateReport360);

router.get('/report360/:group360Id',[
    check('group360Id','ID not valid').isMongoId(),
    check('group360Id').custom(group360IdExists),
    validateFiedls
], getReport360Info);

// ─── Public routes (no auth, token-based) ───

router.get('/review/:token', getReviewByToken);

router.put('/review/:token/save', saveReviewProgress);

router.put('/review/:token/complete', completeReview);

module.exports = router;

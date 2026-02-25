const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const { validateFiedls } = require("../middlewares/validateFields");
const { groupIdExists, churchIdExists } = require("../helpers/dbValidators");
const { getAllGroups, getGroupsByChurchId, getGroupById, createGroup, updateGroup, deleteGroup, addMemberToGroup, removeMemberFromGroup } = require("../controllers/groupController");

router.get('/', getAllGroups);

router.get('/church/:churchId',[
    check('churchId','ID not valid').isMongoId(),
    check('churchId').custom(churchIdExists),
    validateFiedls
], getGroupsByChurchId);

router.get('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(groupIdExists),
    validateFiedls
], getGroupById);

router.post('/', createGroup);

router.put('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(groupIdExists),
    validateFiedls
], updateGroup);

router.delete('/:id',[
    check('id','ID not valid').isMongoId(),
    check('id').custom(groupIdExists),
    validateFiedls
], deleteGroup);

router.post('/addMember/:groupId',[
    check('groupId','ID not valid').isMongoId(),
    check('groupId').custom(groupIdExists),
    validateFiedls
], addMemberToGroup);

router.put('/removeMember/:groupId/:userId',[
    check('groupId','ID not valid').isMongoId(),
    check('groupId').custom(groupIdExists),
    validateFiedls
], removeMemberFromGroup);

module.exports = router;

const Group = require("../models/group");
const Group360 = require("../models/group360");
const Submission360 = require("../models/submission360");

const getAllGroups = async(req, res)=>{
    try {
        const groups = await Group.find().populate('church').populate('members');
        return res.json(groups);
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getGroupsByChurchId = async(req, res)=>{
    const {churchId} = req.params;
    try {
        const groups = await Group.find({ church: churchId }).populate('members');
        return res.json({
            msg:'Ok',
            groups,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getGroupById = async(req, res)=>{
    const {id} = req.params;
    try {
        const group = await Group.findById(id).populate('church').populate('members');
        return res.json({
            msg:'Ok',
            group,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createGroup = async(req, res)=>{
    try {
        const group = new Group(req.body);
        await group.save();
        const populated = await group.populate('church');
        return res.json({
            msg:"Group created",
            group: populated,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateGroup = async(req, res)=>{
    try {
        const {id} = req.params;
        const updatedGroup = await Group.findByIdAndUpdate(id,{$set:req.body},{new:true}).populate('church').populate('members');
        return res.json({group:updatedGroup,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const deleteGroup = async(req, res)=>{
    const {id} = req.params;
    try {
        // Cascade: delete Submission360s -> delete Group360s -> delete Group
        await Submission360.deleteMany({ groupId: id });
        await Group360.deleteMany({ group: id });
        await Group.findByIdAndDelete(id);

        return res.json({msg:"Ok"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const addMemberToGroup = async(req, res)=>{
    const {groupId} = req.params;
    const {userId} = req.body;
    try {
        const group = await Group.findByIdAndUpdate(
            groupId,
            { $addToSet: { members: userId } },
            { new: true }
        ).populate('members');

        return res.json({msg:"Member added", group});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const removeMemberFromGroup = async(req, res)=>{
    const {groupId, userId} = req.params;
    try {
        // Clean up Group360 entries where this user is the reviewee
        const group360s = await Group360.find({ group: groupId, reviewee: userId });
        const group360Ids = group360s.map(g => g._id);
        if(group360Ids.length > 0){
            await Submission360.deleteMany({ groupId, revieweeId: userId });
            await Group360.deleteMany({ group: groupId, reviewee: userId });
        }

        // Also remove as reviewer from any Group360 in this group
        await Group360.updateMany(
            { group: groupId },
            { $pull: { reviewers: { user: userId } } }
        );
        await Submission360.deleteMany({ groupId, reviewerId: userId });

        const group = await Group.findByIdAndUpdate(
            groupId,
            { $pull: { members: userId } },
            { new: true }
        ).populate('members');

        return res.json({msg:"Member removed", group});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

module.exports = {
    getAllGroups,
    getGroupsByChurchId,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup,
}

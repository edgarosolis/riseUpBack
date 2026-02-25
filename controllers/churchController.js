const Church = require("../models/church");
const Group = require("../models/group");
const Group360 = require("../models/group360");
const Submission360 = require("../models/submission360");

const getAllChurches = async(req, res)=>{
    try {
        const churches = await Church.find();
        return res.json(churches);
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getChurchById = async(req, res)=>{
    const {id} = req.params;
    try {
        const church = await Church.findById(id);
        return res.json({
            msg:'Ok',
            church,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createChurch = async(req, res)=>{
    try {
        const church = new Church(req.body);
        await church.save();
        return res.json({
            msg:"Church created",
            church,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateChurch = async(req, res)=>{
    try {
        const {id} = req.params;
        const updatedChurch = await Church.findByIdAndUpdate(id,{$set:req.body},{new:true});
        return res.json({church:updatedChurch,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const deleteChurch = async(req, res)=>{
    const {id} = req.params;
    try {
        // Cascade: find groups -> delete Submission360s -> delete Group360s -> delete Groups -> delete Church
        const groups = await Group.find({ church: id });
        const groupIds = groups.map(g => g._id);

        if(groupIds.length > 0){
            await Submission360.deleteMany({ groupId: { $in: groupIds } });
            await Group360.deleteMany({ group: { $in: groupIds } });
            await Group.deleteMany({ church: id });
        }

        await Church.findByIdAndDelete(id);

        return res.json({msg:"Ok"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

module.exports = {
    getAllChurches,
    getChurchById,
    createChurch,
    updateChurch,
    deleteChurch,
}

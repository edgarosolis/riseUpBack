const Submission360 = require("../models/submission360");

const getAllSubmissions360 = async(req, res)=>{
    try {
        const submissions = await Submission360.find();
        return res.json(submissions);
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getSubmission360ById = async(req, res)=>{
    const {id} = req.params;
    try {
        const submission = await Submission360.findById(id);
        return res.json({
            msg:'Ok',
            submission,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getSubmissions360ByGroup = async(req, res)=>{
    const {groupId} = req.params;
    try {
        const submissions = await Submission360.find({ groupId })
            .populate('reviewerId')
            .populate('revieweeId');
        return res.json({
            msg:'Ok',
            submissions,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getActiveSubmission360 = async(req, res)=>{
    const {reviewerId, revieweeId, groupId} = req.params;
    try {
        const submission = await Submission360.findOne({
            reviewerId,
            revieweeId,
            groupId,
            active: true,
        });
        return res.json({
            msg:'Ok',
            submission,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateSubmission360 = async(req, res)=>{
    try {
        const {id} = req.params;
        if (req.body.finished === true) {
            req.body.completedAt = new Date();
        }
        const updatedSubmission = await Submission360.findByIdAndUpdate(id,{$set:req.body},{new:true});
        return res.json({submission:updatedSubmission,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const deleteSubmission360 = async(req, res)=>{
    const {id} = req.params;
    try {
        await Submission360.findByIdAndDelete(id);
        return res.json({msg:"Ok"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

module.exports = {
    getAllSubmissions360,
    getSubmission360ById,
    getSubmissions360ByGroup,
    getActiveSubmission360,
    updateSubmission360,
    deleteSubmission360,
}

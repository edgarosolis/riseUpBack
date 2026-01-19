const Submission = require("../models/submission");

const getAllSubmissions = async(req=request,res=response)=>{
    try {
        const submissions = await Submission.find();
        return res.json(submissions);
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }

}

const getSubmissionByAssessmentId = async(req,res)=>{
    const {assessmentId} = req.params;
    try {
        const submissions= await Submission.find({assessmentId});
        return res.json({
            msg:'Ok',
            submissions,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getActiveSubmission = async(req,res)=>{
    const {assessmentId,userId} = req.params;
    try {
        const submission= await Submission.findOne({assessmentId,userId,active:true});
        return res.json({
            msg:'Ok',
            submission,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getSubmissionByUserId = async(req,res)=>{
    const {userId} = req.params;
    try {
        const submissions= await Submission.findById({userId});
        return res.json({
            msg:'Ok',
            submissions,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getSubmissionById = async(req,res)=>{
    const {id} = req.params;
    try {
        const submission= await Submission.findById(id);
        return res.json({
            msg:'Ok',
            submission,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createSubmission = async(req,res=response)=>{
    try {
        const submission = new Submission(req.body);
        await submission.save();
    
        return res.json({
            msg:"Submission created",
            submission,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateSubmission = async(req,res)=>{
    try {
        const {id} = req.params;
        const updatedSubmission = await Submission.findByIdAndUpdate(id,{$set:req.body},{new:true});
        return res.json({submission:updatedSubmission,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const deleteSubmission = async(req=request,res=response)=>{
    const {id} = req.params;

    //TODO or turn status to "FALSE"
    await Submission.findByIdAndDelete(id);

    return res.json({
        msg:"Ok"
    })
}

module.exports = {
    getAllSubmissions,
    getActiveSubmission,
    getSubmissionByAssessmentId,
    getSubmissionByUserId,
    getSubmissionById,
    createSubmission,
    updateSubmission,
    deleteSubmission,
}

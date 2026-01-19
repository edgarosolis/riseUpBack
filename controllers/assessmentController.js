const Assessment = require("../models/assessment");

const getAllAssessments = async(req=request,res=response)=>{
    try {
        const assessments = await Assessment.find();
        return res.json(assessments);
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }

}

const getAssessmentById = async(req,res)=>{
    const {id} = req.params;
    try {
        const assessment= await Assessment.findById(id);
        return res.json({
            msg:'Ok',
            assessment,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createAssessment = async(req,res=response)=>{
    try {
        const assessment = new Assessment(req.body);
        await assessment.save();
    
        return res.json({
            msg:"Assessment created",
            assessment,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateAssessment = async(req,res)=>{
    try {
        const {id} = req.params;
        const updatedAssessment = await Assessment.findByIdAndUpdate(id,{$set:req.body},{new:true});
        return res.json({assessment:updatedAssessment,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const deleteAssessment = async(req=request,res=response)=>{
    const {id} = req.params;

    //TODO or turn status to "FALSE"
    await Assessment.findByIdAndDelete(id);

    return res.json({
        msg:"Ok"
    })
}

module.exports = {
    getAllAssessments,
    getAssessmentById,
    createAssessment,
    updateAssessment,
    deleteAssessment,
}

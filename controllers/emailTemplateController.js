const EmailTemplate = require("../models/emailTemplate");

const getAllEmailTemplates = async(req,res)=>{
    try {
        const templates = await EmailTemplate.find();
        return res.json(templates);
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getEmailTemplateById = async(req,res)=>{
    const {id} = req.params;
    try {
        const template = await EmailTemplate.findById(id);
        return res.json({
            msg:'Ok',
            template,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const updateEmailTemplate = async(req,res)=>{
    try {
        const {id} = req.params;
        const updatedTemplate = await EmailTemplate.findByIdAndUpdate(id,{$set:req.body},{new:true});
        return res.json({template:updatedTemplate,msg:"Saved correctly"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

module.exports = {
    getAllEmailTemplates,
    getEmailTemplateById,
    updateEmailTemplate,
}

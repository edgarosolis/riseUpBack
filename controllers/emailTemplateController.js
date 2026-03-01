const EmailTemplate = require("../models/emailTemplate");
const { buildEmailHtml, buildTextBody } = require("../helpers/emailTemplateBuilder");

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
        const { subject, content } = req.body;

        const template = await EmailTemplate.findById(id);
        if (!template) {
            return res.status(404).json({msg:"Template not found"});
        }

        // Update subject
        if (subject) template.subject = subject;

        // Update content fields and regenerate HTML
        if (content) {
            template.content = { ...template.content.toObject?.() || template.content, ...content };
            template.htmlBody = buildEmailHtml(template.slug, template.content);
            template.textBody = buildTextBody(template.slug, template.content);
        }

        template.updatedAt = Date.now();
        await template.save();

        return res.json({template, msg:"Saved correctly"});
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

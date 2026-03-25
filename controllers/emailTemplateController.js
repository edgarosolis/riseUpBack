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
            const existing = template.content.toObject ? template.content.toObject() : { ...template.content };
            template.content = { ...existing, ...content };
            template.markModified('content');
            template.htmlBody = buildEmailHtml(template.slug, template.content);
            template.textBody = buildTextBody(template.slug, template.content);
        }

        template.updatedAt = Date.now();
        await template.save();

        return res.json({template, msg:"Saved correctly"});
    } catch (error) {
        console.log("updateEmailTemplate error:", error);
        return res.status(500).json({msg: error.message || "Server error"});
    }
}

const seedEmailTemplate = async(req,res)=>{
    try {
        const { slug, name, subject, content, variables } = req.body;
        const exists = await EmailTemplate.findOne({ slug });
        if (exists) return res.json({ msg: "Already exists", template: exists });

        const htmlBody = buildEmailHtml(slug, content);
        const textBody = buildTextBody(slug, content);
        const template = new EmailTemplate({ slug, name, subject, content, htmlBody, textBody, variables });
        await template.save();
        return res.json({ msg: "Created", template });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error", error });
    }
}

module.exports = {
    getAllEmailTemplates,
    getEmailTemplateById,
    updateEmailTemplate,
    seedEmailTemplate,
}

const crypto = require("crypto");
const Group360 = require("../models/group360");
const Submission360 = require("../models/submission360");
const Assessment = require("../models/assessment");
const User = require("../models/user");
const Group = require("../models/group");

// ─── Admin endpoints ───

const getGroup360sByGroupId = async(req, res)=>{
    const {groupId} = req.params;
    try {
        const group360s = await Group360.find({ group: groupId })
            .populate('reviewee')
            .populate('reviewers.user');
        return res.json({
            msg:'Ok',
            group360s,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getGroup360ById = async(req, res)=>{
    const {id} = req.params;
    try {
        const group360 = await Group360.findById(id)
            .populate('reviewee')
            .populate('reviewers.user')
            .populate('group');
        return res.json({
            msg:'Ok',
            group360,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const getGroup360sByUserId = async(req, res)=>{
    const {userId} = req.params;
    try {
        const group360s = await Group360.find({ reviewee: userId, active: true })
            .populate('group')
            .populate('reviewers.user');
        return res.json({
            msg:'Ok',
            group360s,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const createGroup360 = async(req, res)=>{
    try {
        const { assessmentId, reviewee, group } = req.body;

        const group360 = new Group360({ assessmentId, reviewee, group });
        await group360.save();

        // Create Submission360 for reviewee self-assessment (reviewerId = revieweeId)
        const selfSubmission = new Submission360({
            assessmentId,
            reviewerId: reviewee,
            revieweeId: reviewee,
            groupId: group,
        });
        await selfSubmission.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({
            msg:"Group360 created",
            group360: populated,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error})
    }
}

const deleteGroup360 = async(req, res)=>{
    const {id} = req.params;
    try {
        const group360 = await Group360.findById(id);
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        // Delete all related Submission360s
        await Submission360.deleteMany({
            groupId: group360.group,
            revieweeId: group360.reviewee
        });

        await Group360.findByIdAndDelete(id);
        return res.json({msg:"Ok"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const addReviewer = async(req, res)=>{
    const {group360Id} = req.params;
    const {userId} = req.body;
    try {
        const group360 = await Group360.findById(group360Id);
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        const reviewToken = crypto.randomUUID();

        group360.reviewers.push({
            user: userId,
            reviewToken,
            status: 'pending'
        });
        await group360.save();

        // Create Submission360 for this reviewer
        const submission = new Submission360({
            assessmentId: group360.assessmentId,
            reviewerId: userId,
            revieweeId: group360.reviewee,
            groupId: group360.group,
        });
        await submission.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({
            msg:"Reviewer added",
            group360: populated,
            reviewToken,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const removeReviewer = async(req, res)=>{
    const {group360Id, reviewerId} = req.params;
    try {
        const group360 = await Group360.findById(group360Id);
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        // Remove reviewer from array
        group360.reviewers = group360.reviewers.filter(
            r => r.user.toString() !== reviewerId
        );
        await group360.save();

        // Delete reviewer's Submission360
        await Submission360.deleteMany({
            reviewerId,
            revieweeId: group360.reviewee,
            groupId: group360.group,
        });

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({msg:"Reviewer removed", group360: populated});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

// ─── Public (token-based, no auth) ───

const getReviewByToken = async(req, res)=>{
    const {token} = req.params;
    try {
        const group360 = await Group360.findOne({ 'reviewers.reviewToken': token, active: true })
            .populate('assessmentId')
            .populate('reviewee')
            .populate('group');

        if(!group360) return res.status(404).json({msg:"Invalid or expired review link"});

        const reviewer = group360.reviewers.find(r => r.reviewToken === token);
        if(!reviewer) return res.status(404).json({msg:"Reviewer not found"});

        if(reviewer.status === 'completed'){
            return res.json({
                msg:'Review already completed',
                completed: true,
                revieweeName: group360.reviewee.firstName,
            });
        }

        // Get or create submission360
        let submission = await Submission360.findOne({
            reviewerId: reviewer.user,
            revieweeId: group360.reviewee._id,
            groupId: group360.group._id,
            active: true,
        });

        if(!submission){
            submission = new Submission360({
                assessmentId: group360.assessmentId._id,
                reviewerId: reviewer.user,
                revieweeId: group360.reviewee._id,
                groupId: group360.group._id,
            });
            await submission.save();
        }

        // Personalize questions: replace {name} with reviewee's first name
        const assessment = group360.assessmentId.toObject();
        const revieweeName = group360.reviewee.firstName;

        if(assessment.sections){
            assessment.sections = assessment.sections.map(section => {
                if(section.questions){
                    section.questions = section.questions.map(q => ({
                        ...q,
                        text: q.text.replace(/\{name\}/g, revieweeName)
                    }));
                }
                return section;
            });
        }

        // Update reviewer status to in_progress if pending
        if(reviewer.status === 'pending'){
            reviewer.status = 'in_progress';
            await group360.save();
        }

        return res.json({
            msg:'Ok',
            assessment,
            revieweeName,
            submission,
            groupName: group360.group.name,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const saveReviewProgress = async(req, res)=>{
    const {token} = req.params;
    try {
        const group360 = await Group360.findOne({ 'reviewers.reviewToken': token, active: true });
        if(!group360) return res.status(404).json({msg:"Invalid or expired review link"});

        const reviewer = group360.reviewers.find(r => r.reviewToken === token);
        if(!reviewer) return res.status(404).json({msg:"Reviewer not found"});

        const submission = await Submission360.findOne({
            reviewerId: reviewer.user,
            revieweeId: group360.reviewee,
            groupId: group360.group,
            active: true,
        });

        if(!submission) return res.status(404).json({msg:"Submission not found"});

        submission.answers = req.body.answers || submission.answers;
        await submission.save();

        return res.json({msg:"Progress saved", submission});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const completeReview = async(req, res)=>{
    const {token} = req.params;
    try {
        const group360 = await Group360.findOne({ 'reviewers.reviewToken': token, active: true });
        if(!group360) return res.status(404).json({msg:"Invalid or expired review link"});

        const reviewer = group360.reviewers.find(r => r.reviewToken === token);
        if(!reviewer) return res.status(404).json({msg:"Reviewer not found"});

        // Mark submission as finished
        const submission = await Submission360.findOne({
            reviewerId: reviewer.user,
            revieweeId: group360.reviewee,
            groupId: group360.group,
            active: true,
        });

        if(submission){
            submission.finished = true;
            submission.completedAt = new Date();
            if(req.body.answers) submission.answers = req.body.answers;
            await submission.save();
        }

        // Update reviewer status to completed
        reviewer.status = 'completed';

        // Check if all reviewers are done -> mark Group360 as completed
        const allDone = group360.reviewers.every(r => r.status === 'completed');
        if(allDone){
            group360.completed = true;
        }
        await group360.save();

        return res.json({msg:"Review completed", completed: true});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

module.exports = {
    getGroup360sByGroupId,
    getGroup360ById,
    getGroup360sByUserId,
    createGroup360,
    deleteGroup360,
    addReviewer,
    removeReviewer,
    getReviewByToken,
    saveReviewProgress,
    completeReview,
}

const crypto = require("crypto");
const Group360 = require("../models/group360");
const Submission360 = require("../models/submission360");
const Assessment = require("../models/assessment");
const Result = require("../models/result");
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

        // Personalize questions: replace {name} or pronouns with reviewee's first name
        const assessment = group360.assessmentId.toObject();
        const revieweeName = group360.reviewee.firstName;

        const personalizeText = (text) => {
            // If the text has {name} placeholders, use those
            if(text.includes('{name}')){
                return text.replace(/\{name\}/g, revieweeName);
            }
            // Otherwise, transform pronouns for the reviewer context
            let t = text;
            t = t.replace(/\byourself\b/gi, revieweeName);
            t = t.replace(/\bYour\b/g, `${revieweeName}'s`);
            t = t.replace(/\byour\b/g, `${revieweeName}'s`);
            t = t.replace(/\bYou\b/g, revieweeName);
            t = t.replace(/\byou\b/g, revieweeName);
            return t;
        };

        if(assessment.sections){
            assessment.sections = assessment.sections.map(section => {
                if(section.questions){
                    section.questions = section.questions.map(q => ({
                        ...q,
                        text: personalizeText(q.text)
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

// ─── Report endpoints ───

const toggleReport360 = async(req, res)=>{
    const {group360Id} = req.params;
    try {
        const group360 = await Group360.findById(group360Id);
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        group360.reportReady = !group360.reportReady;
        await group360.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({
            msg:'Ok',
            group360: populated,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const getFinalResults360 = async (countsBySection, assessmentId) => {
    const fullReport = [];

    let keysS2 = [];
    let keysS3 = [];

    for (const sectionKey in countsBySection) {
        const categories = countsBySection[sectionKey];

        const sorted = Object.entries(categories).sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            } else {
                return a[0].localeCompare(b[0]);
            }
        });

        const topTwo = sorted.slice(0, 2);
        const [first, second] = topTwo;
        let searchQueries = new Set();

        if(sectionKey === "s1"){
            if((first[1] >= 9) && ((first[1]-second[1]) >= 2)){
                searchQueries.add(first[0]);
            }
            if(second[1] >= 4){
                searchQueries.add(`${first[0]} + ${second[0]}`);
            }
            if((first[1] === second[1]) && first[1] >= 4 && second[1] >= 4){
                searchQueries.add(`${first[0]} and ${second[0]}`);
            }
        }else{
            if((first[1] >= 10) && ((first[1]-second[1]) >= 2)){
                searchQueries.add(first[0]);
            }
            if (second[1] >= 4) {
                searchQueries.add(`${first[0]} + ${second[0]}`);
                searchQueries.add(`${second[0]} + ${first[0]}`);
            }
        }

        if (searchQueries.size === 0) searchQueries.add(first[0]);
        const categoryKeyArray = Array.from(searchQueries);

        if (sectionKey === "s2") keysS2 = categoryKeyArray;
        if (sectionKey === "s3") keysS3 = categoryKeyArray;

        const resultText = await Result.findOne({
            assessmentId,
            sectionCustomId: sectionKey,
            category: { $in: categoryKeyArray }
        });

        fullReport.push({
            section: sectionKey,
            topCategories: topTwo,
            keyUsed: categoryKeyArray,
            content: resultText ? resultText : {
                title: categoryKeyArray,
                content: "NOT FOUND"
            }
        });
    }

    const s4 = [];
    keysS2.forEach(val2 => {
        keysS3.forEach(val3 => {
            s4.push(`${val2} + ${val3}`);
        });
    });

    if (s4.length > 0) {
        const resultR1 = await Result.findOne({
            assessmentId,
            sectionCustomId: 'r1',
            category: { $in: s4 }
        });

        fullReport.push({
            section: 'r1',
            keyUsed: s4[0],
            content: resultR1 || {
                title: s4[0],
                content: "NOT FOUND"
            }
        });
    }

    return fullReport;
};

const getReport360Info = async(req, res)=>{
    const {group360Id} = req.params;
    try {
        const group360 = await Group360.findById(group360Id).populate('assessmentId');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        const assessment = group360.assessmentId;
        if(!assessment) return res.status(404).json({msg:"Assessment not found"});

        // Find ALL finished Submission360s for this reviewee in this group
        const finishedSubmissions = await Submission360.find({
            revieweeId: group360.reviewee,
            groupId: group360.group,
            finished: true,
            active: true,
        });

        if(finishedSubmissions.length === 0){
            return res.status(400).json({msg:"No completed submissions found"});
        }

        const totalSubmissions = finishedSubmissions.length;

        // For each submission, compute category counts per section (same as reportController)
        // Then average across all submissions
        const averagedCounts = {};

        finishedSubmissions.forEach(submission => {
            assessment.sections.forEach(section => {
                const sectionId = section.customId || section._id.toString();
                if(!averagedCounts[sectionId]) averagedCounts[sectionId] = {};

                section.questions.forEach(question => {
                    const userChoice = submission.answers.find(a => a.customId === question.customId);

                    if(userChoice){
                        const selectedOption = question.options.find(opt => opt.text === userChoice.value);

                        if(selectedOption && selectedOption.category){
                            const cat = selectedOption.category;
                            averagedCounts[sectionId][cat] = (averagedCounts[sectionId][cat] || 0) + 1;
                        }
                    }
                });
            });
        });

        // Average: divide each count by totalSubmissions
        for(const sectionId in averagedCounts){
            for(const cat in averagedCounts[sectionId]){
                averagedCounts[sectionId][cat] = averagedCounts[sectionId][cat] / totalSubmissions;
            }
        }

        const reportInfo = await getFinalResults360(averagedCounts, assessment._id);

        return res.json({
            msg:'Ok',
            report: reportInfo,
            submissionCount: totalSubmissions,
        });
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
    toggleReport360,
    getReport360Info,
}

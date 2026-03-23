const crypto = require("crypto");
const bcryptjs = require("bcryptjs");
const Group360 = require("../models/group360");
const Submission360 = require("../models/submission360");
const Submission = require("../models/submission");
const Assessment = require("../models/assessment");
const Result = require("../models/result");
const User = require("../models/user");
const Group = require("../models/group");
const { sendInvitationEmail, sendReminderEmail } = require("../services/emailService");

const FRONT_URL = process.env.FRONT_URL || "https://assessments.theriseupculture.com/";

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

        // Reset report status since reviewer list changed
        if(group360.reportReady){
            group360.reportReady = false;
        }

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

        // Personalize questions for reviewer context
        const assessment = group360.assessmentId.toObject();
        const revieweeName = group360.reviewee.firstName;

        if(assessment.sections){
            assessment.sections = assessment.sections.map(section => {
                // Use reviewerDescription if available, replacing {name} with reviewee name
                if(section.reviewerDescription){
                    section.description = section.reviewerDescription.replace(/\{name\}/g, revieweeName);
                }
                if(section.questions){
                    section.questions = section.questions.map(q => {
                        // Use reviewerText if available, otherwise fall back to original text
                        const displayText = q.reviewerText
                            ? q.reviewerText.replace(/\{name\}/g, revieweeName)
                            : q.text;
                        return { ...q, text: displayText };
                    });
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

        if (!first) continue;

        if(sectionKey === "s1"){
            if(second && (first[1] >= 9) && ((first[1]-second[1]) >= 2)){
                searchQueries.add(first[0]);
            }
            if(second && second[1] >= 4){
                searchQueries.add(`${first[0]} + ${second[0]}`);
            }
            if(second && (first[1] === second[1]) && first[1] >= 4 && second[1] >= 4){
                searchQueries.add(`${first[0]} and ${second[0]}`);
            }
        }else{
            if(second && (first[1] >= 10) && ((first[1]-second[1]) >= 2)){
                searchQueries.add(first[0]);
            }
            if (second && second[1] >= 4) {
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

const computeCategoryCounts = (submissions, assessment) => {
    const counts = {};
    submissions.forEach(submission => {
        assessment.sections.forEach(section => {
            const sectionId = section.customId || section._id.toString();
            if(!counts[sectionId]) counts[sectionId] = {};

            section.questions.forEach(question => {
                const userChoice = submission.answers.find(a => a.customId === question.customId);
                if(userChoice){
                    const selectedOption = question.options.find(opt => opt.text === userChoice.value);
                    if(selectedOption && selectedOption.category){
                        const cat = selectedOption.category;
                        counts[sectionId][cat] = (counts[sectionId][cat] || 0) + 1;
                    }
                }
            });
        });
    });
    return counts;
};

const getReport360Info = async(req, res)=>{
    const {group360Id} = req.params;
    try {
        const group360 = await Group360.findById(group360Id).populate('assessmentId');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        const assessment = group360.assessmentId;
        if(!assessment) return res.status(404).json({msg:"Assessment not found"});

        // ─── Self-assessment: from personal Submission model ───
        let selfReport = null;
        const selfSubmission = await Submission.findOne({
            assessmentId: assessment._id,
            userId: group360.reviewee,
            finished: true,
            active: true,
        });

        if(selfSubmission){
            const selfCounts = computeCategoryCounts([selfSubmission], assessment);
            selfReport = await getFinalResults360(selfCounts, assessment._id);
        }

        // ─── Reviewer compilation: Submission360 where reviewer !== reviewee ───
        const reviewerSubmissions = await Submission360.find({
            revieweeId: group360.reviewee,
            groupId: group360.group,
            finished: true,
            active: true,
            reviewerId: { $ne: group360.reviewee },
        });

        let reviewerReport = null;
        const reviewerCount = reviewerSubmissions.length;

        if(reviewerCount > 0){
            const reviewerCounts = computeCategoryCounts(reviewerSubmissions, assessment);

            // Average across all reviewer submissions
            for(const sectionId in reviewerCounts){
                for(const cat in reviewerCounts[sectionId]){
                    reviewerCounts[sectionId][cat] = reviewerCounts[sectionId][cat] / reviewerCount;
                }
            }

            reviewerReport = await getFinalResults360(reviewerCounts, assessment._id);
        }

        // Main report is always the personal assessment
        const report = selfReport;

        return res.json({
            msg:'Ok',
            selfReport,
            reviewerReport,
            reviewerCount,
            totalInvited: group360.reviewers.length,
            report,
            submissionCount: reviewerCount,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

// ─── User-facing Setup360 endpoints ───

const addReviewerByEmail = async(req, res)=>{
    const {group360Id} = req.params;
    const {firstName, lastName, email} = req.body;
    try {
        const group360 = await Group360.findById(group360Id).populate('reviewee');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        // Enforce max 10 reviewers
        if(group360.reviewers.length >= 10){
            return res.status(400).json({msg:"Maximum of 10 reviewers allowed"});
        }

        // Prevent adding self
        if(group360.reviewee.email.toLowerCase() === email.toLowerCase()){
            return res.status(400).json({msg:"You cannot add yourself as a reviewer"});
        }

        // Prevent duplicates by email
        const existingReviewerUsers = await User.find({
            _id: { $in: group360.reviewers.map(r => r.user) }
        });
        const existingEmails = existingReviewerUsers.map(u => u.email.toLowerCase());
        if(existingEmails.includes(email.toLowerCase())){
            return res.status(400).json({msg:"This reviewer has already been added"});
        }

        // Find existing user by email OR create new one
        let user = await User.findOne({ email: email.toLowerCase() });
        if(!user){
            const salt = bcryptjs.genSaltSync();
            const randomPass = crypto.randomUUID().slice(0, 8);
            user = new User({
                firstName,
                lastName,
                email: email.toLowerCase(),
                password: bcryptjs.hashSync(randomPass, salt),
                rawPassword: randomPass,
                rol: "user"
            });
            await user.save();
        }

        const reviewToken = crypto.randomUUID();
        group360.reviewers.push({
            user: user._id,
            reviewToken,
            status: 'pending'
        });
        await group360.save();

        // Create Submission360 for this reviewer
        const submission = new Submission360({
            assessmentId: group360.assessmentId,
            reviewerId: user._id,
            revieweeId: group360.reviewee._id,
            groupId: group360.group,
        });
        await submission.save();

        // Auto-send invitation email
        const addedReviewer = group360.reviewers.find(r => r.reviewToken === reviewToken);
        try {
            const reviewUrl = `${FRONT_URL}review/${reviewToken}`;
            await sendInvitationEmail(
                user.email,
                user.firstName,
                group360.reviewee.firstName,
                reviewUrl
            );
            if(addedReviewer) addedReviewer.invitedAt = new Date();
            await group360.save();
        } catch(emailErr) {
            console.log(`Auto-invitation email failed for ${user.email}:`, emailErr);
        }

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({
            msg:"Reviewer added and invitation sent",
            group360: populated,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

const updateReviewer = async(req, res)=>{
    const {group360Id, reviewerId} = req.params;
    const {firstName, lastName, email} = req.body;
    try {
        const group360 = await Group360.findById(group360Id);
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        const reviewerEntry = group360.reviewers.find(r => r.user.toString() === reviewerId);
        if(!reviewerEntry) return res.status(404).json({msg:"Reviewer not found in this group"});

        const user = await User.findById(reviewerId);
        if(!user) return res.status(404).json({msg:"User not found"});

        // Check for email conflict if email is changing
        if(email && email.toLowerCase() !== user.email.toLowerCase()){
            const conflict = await User.findOne({ email: email.toLowerCase() });
            if(conflict) return res.status(400).json({msg:"A user with this email already exists"});
        }

        if(firstName) user.firstName = firstName;
        if(lastName) user.lastName = lastName;
        if(email) user.email = email.toLowerCase();
        await user.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({msg:"Reviewer updated", group360: populated});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Server error",error});
    }
}

// ─── Invitation & Reminder endpoints ───

const inviteReviewer = async(req, res)=>{
    const {group360Id, reviewerId} = req.params;
    try {
        const group360 = await Group360.findById(group360Id).populate('reviewee');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        const reviewer = group360.reviewers.find(r => r.user.toString() === reviewerId);
        if(!reviewer) return res.status(404).json({msg:"Reviewer not found"});

        const reviewerUser = await User.findById(reviewerId);
        if(!reviewerUser) return res.status(404).json({msg:"Reviewer user not found"});

        const reviewUrl = `${FRONT_URL}review/${reviewer.reviewToken}`;
        await sendInvitationEmail(
            reviewerUser.email,
            reviewerUser.firstName,
            group360.reviewee.firstName,
            reviewUrl
        );

        reviewer.invitedAt = new Date();
        await group360.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({msg:"Invitation sent", group360: populated});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Error sending invitation",error});
    }
}

const inviteAllReviewers = async(req, res)=>{
    const {group360Id} = req.params;
    try {
        const group360 = await Group360.findById(group360Id).populate('reviewee');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        let sentCount = 0;
        for(const reviewer of group360.reviewers){
            if(reviewer.status === 'completed') continue;

            const reviewerUser = await User.findById(reviewer.user);
            if(!reviewerUser) continue;

            const reviewUrl = `${FRONT_URL}review/${reviewer.reviewToken}`;
            try {
                await sendInvitationEmail(
                    reviewerUser.email,
                    reviewerUser.firstName,
                    group360.reviewee.firstName,
                    reviewUrl
                );
                reviewer.invitedAt = new Date();
                sentCount++;
            } catch(e) {
                console.log(`Failed to send invitation to ${reviewerUser.email}:`, e);
            }
        }

        await group360.save();
        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({msg:`${sentCount} invitation(s) sent`, group360: populated});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Error sending invitations",error});
    }
}

const remindReviewer = async(req, res)=>{
    const {group360Id, reviewerId} = req.params;
    try {
        const group360 = await Group360.findById(group360Id).populate('reviewee');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        const reviewer = group360.reviewers.find(r => r.user.toString() === reviewerId);
        if(!reviewer) return res.status(404).json({msg:"Reviewer not found"});

        const reviewerUser = await User.findById(reviewerId);
        if(!reviewerUser) return res.status(404).json({msg:"Reviewer user not found"});

        const reviewUrl = `${FRONT_URL}review/${reviewer.reviewToken}`;
        await sendReminderEmail(
            reviewerUser.email,
            reviewerUser.firstName,
            group360.reviewee.firstName,
            reviewUrl
        );

        reviewer.lastRemindedAt = new Date();
        await group360.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({msg:"Reminder sent", group360: populated});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Error sending reminder",error});
    }
}

const remindAllReviewers = async(req, res)=>{
    const {group360Id} = req.params;
    try {
        const group360 = await Group360.findById(group360Id).populate('reviewee');
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        let sentCount = 0;
        for(const reviewer of group360.reviewers){
            if(reviewer.status === 'completed') continue;

            const reviewerUser = await User.findById(reviewer.user);
            if(!reviewerUser) continue;

            const reviewUrl = `${FRONT_URL}review/${reviewer.reviewToken}`;
            try {
                await sendReminderEmail(
                    reviewerUser.email,
                    reviewerUser.firstName,
                    group360.reviewee.firstName,
                    reviewUrl
                );
                reviewer.lastRemindedAt = new Date();
                sentCount++;
            } catch(e) {
                console.log(`Failed to send reminder to ${reviewerUser.email}:`, e);
            }
        }

        await group360.save();
        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({msg:`${sentCount} reminder(s) sent`, group360: populated});
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:"Error sending reminders",error});
    }
}

// ─── Generate Report (replaces toggle) ───

const generateReport360 = async(req, res)=>{
    const {group360Id} = req.params;
    try {
        const group360 = await Group360.findById(group360Id);
        if(!group360) return res.status(404).json({msg:"Group360 not found"});

        // Check that reviewee has completed their personal assessment
        const personalSubmission = await Submission.findOne({
            assessmentId: group360.assessmentId,
            userId: group360.reviewee,
            finished: true,
            active: true,
        });

        // Count completed reviewer submissions (exclude self-assessments)
        const completedCount = await Submission360.countDocuments({
            revieweeId: group360.reviewee,
            groupId: group360.group,
            finished: true,
            active: true,
            reviewerId: { $ne: group360.reviewee }
        });

        if(!personalSubmission || completedCount < 3){
            const reasons = [];
            if(!personalSubmission) reasons.push("your personal assessment is not yet completed");
            if(completedCount < 3) reasons.push(`at least 3 reviewer submissions are required (currently ${completedCount})`);
            return res.status(400).json({
                msg:`Unable to generate report: ${reasons.join(", and ")}.`,
                completedCount,
                personalAssessmentComplete: !!personalSubmission,
            });
        }

        group360.reportReady = true;
        await group360.save();

        const populated = await group360.populate(['reviewee', 'reviewers.user']);
        return res.json({
            msg:'Report generated',
            group360: populated,
            completedCount,
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
    addReviewerByEmail,
    updateReviewer,
    inviteReviewer,
    inviteAllReviewers,
    remindReviewer,
    remindAllReviewers,
    generateReport360,
}

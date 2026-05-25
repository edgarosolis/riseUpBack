const User = require('../models/user');
const Submission = require('../models/submission');
const Assessment = require('../models/assessment');
const Group = require('../models/group');
const Group360 = require('../models/group360');
const Submission360 = require('../models/submission360');
const { normalizeName } = require('../helpers/normalizeName');

const isBlank = (v) => !String(v || '').trim();

const KINGDOM_CALLING_ASSESSMENT_ID = '69694fa65b16328a2cd50da7';

const provision360 = async (userId, firstName) => {
    const existing = await Group360.findOne({ reviewee: userId });
    if (existing) {
        const existingGroup = await Group.findById(existing.group);
        return { group: existingGroup, group360: existing };
    }

    const assessment = await Assessment.findOne({ active: true });
    if (!assessment) throw new Error('No active assessment found');

    const group = await Group.create({
        name: `${firstName}'s Team`,
        members: [userId],
        assessmentId: assessment._id,
    });

    const group360 = await Group360.create({
        assessmentId: assessment._id,
        reviewee: userId,
        group: group._id,
    });

    return { group, group360 };
};

const deprovision360 = async (userId) => {
    const group360s = await Group360.find({ reviewee: userId });
    for (const g360 of group360s) {
        await Submission360.deleteMany({ groupId: g360.group });
        await Group360.findByIdAndDelete(g360._id);
        await Group.findByIdAndDelete(g360.group);
    }
};

const ensureKingdomCallingSubmission = async (userId) => {
    const existing = await Submission.findOne({
        userId,
        assessmentId: KINGDOM_CALLING_ASSESSMENT_ID,
    });
    if (existing) return existing;
    return Submission.create({
        assessmentId: KINGDOM_CALLING_ASSESSMENT_ID,
        userId,
    });
};

/**
 * Find-or-create a user by email and reconcile assessment access.
 *
 * - Creates the user if missing.
 * - Always ensures a Kingdom Calling submission exists.
 * - Upgrades has360 from false → true when requested; never downgrades.
 * - Provisions Group / Group360 when has360 flips on.
 *
 * Returns { user, wasCreated, wasUpgraded } so callers can decide whether
 * to send a first-time welcome email.
 */
const provisionUser = async ({ email, firstName, lastName, name, fullName, username, has360 = false, source = 'manual' }) => {
    if (!email) throw new Error('email is required');

    const normalizedEmail = String(email).trim().toLowerCase();
    const wantsHas360 = Boolean(has360);

    // Upstream integrations (LearnWorlds via Zapier) often send a blank firstName
    // or stuff the name into the wrong field. Normalize before persisting so we
    // never store an empty firstName.
    const norm = normalizeName({ firstName, lastName, name, fullName, username, email: normalizedEmail });
    firstName = norm.firstName;
    lastName = norm.lastName;

    let user = await User.findOne({ email: normalizedEmail });
    let wasCreated = false;
    let wasUpgraded = false;

    if (!user) {
        user = await User.create({
            email: normalizedEmail,
            firstName,
            lastName,
            rol: 'user',
            has360: wantsHas360,
            source,
        });
        wasCreated = true;
    } else {
        let dirty = false;
        // Self-heal: backfill a name that an earlier event stored blank.
        if (firstName && isBlank(user.firstName)) { user.firstName = firstName; dirty = true; }
        if (lastName && isBlank(user.lastName)) { user.lastName = lastName; dirty = true; }
        if (wantsHas360 && !user.has360) { user.has360 = true; wasUpgraded = true; dirty = true; }
        if (dirty) await user.save();
    }

    await ensureKingdomCallingSubmission(user._id);

    if (user.has360) {
        try {
            await provision360(user._id, user.firstName || firstName || 'Friend');
        } catch (err) {
            console.log('360 provisioning error in provisionUser:', err.message);
        }
    }

    return { user, wasCreated, wasUpgraded };
};

module.exports = {
    provisionUser,
    provision360,
    deprovision360,
    KINGDOM_CALLING_ASSESSMENT_ID,
};

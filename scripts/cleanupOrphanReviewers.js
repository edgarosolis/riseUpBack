// One-time cleanup: remove Group360.reviewers entries whose User no longer exists.
// These orphans were created because deleteUser used to hard-delete users without
// pulling them from Group360.reviewers. They show up as empty cards on the user-facing
// Setup360 page and inflate completed counts vs. the admin view.
//
// Run: node scripts/cleanupOrphanReviewers.js

const mongoose = require('mongoose');
require('dotenv').config();
const Group360 = require('../models/group360');
const User = require('../models/user');
const Submission360 = require('../models/submission360');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB, { dbName: 'RiseUp' });
        console.log('Connected.');

        const groups = await Group360.find({ 'reviewers.0': { $exists: true } });
        let totalRemoved = 0;
        let groupsTouched = 0;

        for (const g of groups) {
            const userIds = g.reviewers.map(r => r.user).filter(Boolean);
            const existing = await User.find({ _id: { $in: userIds } }).select('_id');
            const existingSet = new Set(existing.map(u => u._id.toString()));

            const before = g.reviewers.length;
            const orphans = g.reviewers.filter(r => !r.user || !existingSet.has(r.user.toString()));
            if (orphans.length === 0) continue;

            const orphanIds = orphans.map(r => r.user).filter(Boolean);
            g.reviewers = g.reviewers.filter(r => r.user && existingSet.has(r.user.toString()));
            // Reviewer list changed — invalidate any prior generated report
            g.reportReady = false;
            await g.save();

            // Drop their submissions for this reviewee/group too
            if (orphanIds.length) {
                await Submission360.deleteMany({
                    reviewerId: { $in: orphanIds },
                    revieweeId: g.reviewee,
                    groupId: g.group,
                });
            }

            totalRemoved += (before - g.reviewers.length);
            groupsTouched += 1;
            console.log(`Group360 ${g._id}: removed ${before - g.reviewers.length} orphan(s)`);
        }

        console.log(`\nDone. Removed ${totalRemoved} orphan reviewer(s) across ${groupsTouched} Group360 doc(s).`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

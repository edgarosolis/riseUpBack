// Backfill users that were provisioned with an empty firstName (LearnWorlds→Zapier
// mis-mapped the name into lastName, or left it blank). Derives a usable firstName
// with the same logic the live provisioning now uses, and repairs the broken
// "'s Team" group name that provision360 generated when firstName was empty.
//
// Dry-run (default):  node scripts/backfillUserNames.js
// Apply changes:      node scripts/backfillUserNames.js --apply

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user');
const Group = require('../models/group');
const Group360 = require('../models/group360');
const { normalizeName } = require('../helpers/normalizeName');

const isBlank = (v) => !String(v || '').trim();

(async () => {
    const apply = process.argv.includes('--apply');
    try {
        await mongoose.connect(process.env.MONGODB, { dbName: 'RiseUp' });
        console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

        const users = await User.find({
            $or: [{ firstName: { $in: [null, ''] } }, { firstName: { $exists: false } }],
        });
        console.log(`Found ${users.length} user(s) with a blank firstName.\n`);

        let changed = 0;
        let skipped = 0;
        let groupsRenamed = 0;

        for (const u of users) {
            const { firstName, lastName } = normalizeName({
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
            });

            if (isBlank(firstName)) {
                console.log(`SKIP  ${u.email} — could not derive a name`);
                skipped++;
                continue;
            }

            console.log(
                `FIX   ${u.email}: firstName "${u.firstName || ''}" → "${firstName}", ` +
                `lastName "${u.lastName || ''}" → "${lastName}"`
            );

            if (apply) {
                u.firstName = firstName;
                u.lastName = lastName;
                await u.save();

                // Repair the auto-generated group name only if it's the broken "'s Team" artifact.
                const g360s = await Group360.find({ reviewee: u._id });
                for (const g of g360s) {
                    const group = await Group.findById(g.group);
                    if (group && /^'s Team$/.test(String(group.name || '').trim())) {
                        group.name = `${firstName}'s Team`;
                        await group.save();
                        groupsRenamed++;
                        console.log(`      ↳ renamed group ${group._id} → "${group.name}"`);
                    }
                }
            }
            changed++;
        }

        console.log(
            `\n${apply ? 'Updated' : 'Would update'} ${changed} user(s)` +
            (apply ? `, renamed ${groupsRenamed} group(s)` : '') +
            `, skipped ${skipped}.`
        );
        if (!apply && changed) console.log('Re-run with --apply to write changes.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

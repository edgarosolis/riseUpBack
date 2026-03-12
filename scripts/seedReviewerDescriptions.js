/**
 * Seed reviewer-specific section descriptions for the 360 assessment.
 * These descriptions use {name} as a placeholder for the reviewee's first name.
 *
 * Usage: node scripts/seedReviewerDescriptions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assessment = require('../models/assessment');
const { dbConnection } = require('../database/config');

const reviewerDescriptions = {
    'Sphere of Influence': `Every leader carries a unique assignment. Some are drawn to boardrooms, while others are drawn to classrooms. Some shape culture through creativity, while others do so through family or government. Your "sphere of influence" is the place God has wired you to impact most deeply.

In this section, you'll help {name} explore where their leadership belongs. There are no right or wrong answers, and your input will be combined with the input of others.

For each of the questions below, many choices may be good for {name}, but please choose the ONE answer you believe fits them best.`,

    'Five-Fold Personality Leaning': `In Ephesians 4, Scripture tells us that Jesus gave 5-fold gifts—apostle, prophet, evangelist, shepherd, and teacher—to equip and build up the Church. These are leadership offices, given to some.

But there's also something broader: the 5-fold personality. Every believer reflects part of Jesus' heart, and these five expressions describe the full range of His leadership style. That means while not everyone carries a 5-fold office, each of us carries a 5-fold leaning.

Someone's 5-fold personality reveals the way they most naturally lead:

<strong>Apostolic</strong> – pioneering, building, and advancing new ground.
<strong>Prophetic</strong> – seeing and speaking God's heart.
<strong>Evangelistic</strong> – inviting and igniting passion in others.
<strong>Shepherding</strong> – caring, protecting, and guiding people.
<strong>Teaching</strong> – clarifying truth and helping others grow.

This section isn't about titles. It's about discovering the part of God's heart {name} carries into every space they lead.

For each of the questions below, many choices may be good for {name}, but please choose the ONE answer you believe fits them best.`,

    'Biblical DNA': `God has always raised up leaders, ordinary people with extraordinary assignments. Joseph, Esther, Gideon, David, Barnabas, Nehemiah… each carried a unique leadership DNA that changed history. And the same God who wrote their stories is writing yours.

This section will help you recognize the biblical leader or leaders {name} resonates with most.

For each of the questions below, many choices may be good for {name}, but please choose the ONE answer you believe fits them best.`
};

const run = async () => {
    await dbConnection();

    const assessments = await Assessment.find({ active: true });
    let updated = 0;

    for (const assessment of assessments) {
        let changed = false;

        for (const section of assessment.sections) {
            for (const [titleMatch, desc] of Object.entries(reviewerDescriptions)) {
                if (section.title && section.title.includes(titleMatch)) {
                    section.reviewerDescription = desc;
                    changed = true;
                    console.log(`  ✓ Set reviewerDescription for "${section.title}"`);
                }
            }
        }

        if (changed) {
            await assessment.save();
            updated++;
            console.log(`Updated assessment: "${assessment.title}"\n`);
        }
    }

    console.log(`\nDone. Updated ${updated} assessment(s).`);
    await mongoose.disconnect();
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});

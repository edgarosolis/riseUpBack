/**
 * Seed the welcomeIntro field on active assessments with the current
 * hardcoded copy from the 360 candidate WelcomeIntro component.
 * Typos in the original source are corrected here.
 *
 * Usage: node scripts/seedWelcomeIntro.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assessment = require('../models/assessment');
const { dbConnection } = require('../database/config');

const welcomeIntro = {
    headings: [
        "Deep down, you know you were made for more.",
        "Not just to survive, but to transform the world around you."
    ],
    intro: "This assessment is designed to help you uncover the God-given leadership DNA already inside you. Every believer is called to lead—not always from a platform, but always with Kingdom influence. The world changes when ordinary people realize they're extraordinary in Christ.",
    bulletsLead: "In just a few minutes, you'll discover:",
    bullets: [
        { bold: "Your Sphere of Influence", text: " — where you're uniquely called to lead (business, ministry, education, etc.)." },
        { bold: "Your Five-Fold Personality", text: " — how you express God's heart (apostolic, prophetic, evangelistic, shepherd, or teacher personalities)." },
        { bold: "Your Biblical DNA", text: " — which biblical leaders reflect your gifts and style." }
    ],
    closingParagraphs: [
        "Afterward, you'll receive a personalized Destiny Report that awakens you to God's design and launches you into His call.",
        "There are 60 total questions. 2 demographic (Name and Email), 18 Sphere, 20 Five Fold and 20 DNA.",
        "The assessment should take approximately 30-40 minutes to complete. Go at your own pace. Everything saves automatically, so you can step away and continue later whenever you're ready. There are no wrong answers!",
        "This isn't just about taking a test. It's about awakening the potential in you.",
        "Because what God has put in you is bigger than you think.",
        "Ready?"
    ],
    callToAction: "Let's step into discovery together. Watch this short welcome video from Pastor Drew to start."
};

const run = async () => {
    await dbConnection();

    const assessments = await Assessment.find({ active: true });
    let updated = 0;

    for (const assessment of assessments) {
        assessment.welcomeIntro = welcomeIntro;
        await assessment.save();
        updated++;
        console.log(`Seeded welcomeIntro on: "${assessment.title}"`);
    }

    console.log(`\nDone. Updated ${updated} assessment(s).`);
    await mongoose.disconnect();
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});

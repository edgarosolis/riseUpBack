/**
 * Seed script: Clone the existing assessment for 360 peer review use.
 *
 * Usage: node scripts/seed360Assessment.js
 *
 * This script:
 * 1. Fetches the first active assessment
 * 2. Deep-clones it with "360" added to the title
 * 3. Transforms question text: replaces pronouns with {name} placeholder
 * 4. Saves as a new assessment document
 *
 * The {name} placeholder is replaced at serve time with the reviewee's first name.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { dbConnection } = require("../database/config");
const Assessment = require("../models/assessment");

const transformQuestionText = (text) => {
    if (!text) return text;

    // Match both straight (') and curly (’) apostrophes in contractions
    const APOS = "['’]";

    let transformed = text;

    // Order matters: longer patterns and contractions first to avoid partial matches
    transformed = transformed.replace(/\bYourself\b/g, '{name}');
    transformed = transformed.replace(/\byourself\b/g, '{name}');
    // Contractions — must run before bare "you/Your"
    transformed = transformed.replace(new RegExp(`\\bYou${APOS}re\\b`, 'g'), '{name} is');
    transformed = transformed.replace(new RegExp(`\\byou${APOS}re\\b`, 'g'), '{name} is');
    transformed = transformed.replace(new RegExp(`\\bYou${APOS}ll\\b`, 'g'), '{name} will');
    transformed = transformed.replace(new RegExp(`\\byou${APOS}ll\\b`, 'g'), '{name} will');
    transformed = transformed.replace(new RegExp(`\\bYou${APOS}ve\\b`, 'g'), '{name} has');
    transformed = transformed.replace(new RegExp(`\\byou${APOS}ve\\b`, 'g'), '{name} has');
    transformed = transformed.replace(new RegExp(`\\bYou${APOS}d\\b`, 'g'), '{name} would');
    transformed = transformed.replace(new RegExp(`\\byou${APOS}d\\b`, 'g'), '{name} would');
    transformed = transformed.replace(/\bYou are\b/g, '{name} is');
    transformed = transformed.replace(/\byou are\b/g, '{name} is');
    transformed = transformed.replace(/\bYou have\b/g, '{name} has');
    transformed = transformed.replace(/\byou have\b/g, '{name} has');
    transformed = transformed.replace(/\bYou will\b/g, '{name} will');
    transformed = transformed.replace(/\byou will\b/g, '{name} will');
    transformed = transformed.replace(/\bYour\b/g, "{name}'s");
    transformed = transformed.replace(/\byour\b/g, "{name}'s");
    transformed = transformed.replace(/\bYou\b/g, '{name}');
    transformed = transformed.replace(/\byou\b/g, '{name}');
    transformed = transformed.replace(/\bI\b/g, '{name}');
    transformed = transformed.replace(/\bmy\b/g, "{name}'s");
    transformed = transformed.replace(/\bMy\b/g, "{name}'s");
    transformed = transformed.replace(/\bme\b/g, '{name}');
    transformed = transformed.replace(/\bMe\b/g, '{name}');
    transformed = transformed.replace(/\bmyself\b/g, '{name}');
    transformed = transformed.replace(/\bMyself\b/g, '{name}');

    return transformed;
};

const seed360Assessment = async () => {
    try {
        await dbConnection();

        // Find the first active assessment
        const original = await Assessment.findOne({ active: true });
        if (!original) {
            console.log("No active assessment found to clone.");
            process.exit(1);
        }

        console.log(`Found assessment: "${original.title}" (${original._id})`);

        // Check if 360 version already exists
        const existing360 = await Assessment.findOne({ title: { $regex: /360/ } });
        if (existing360) {
            console.log(`360 assessment already exists: "${existing360.title}" (${existing360._id})`);
            console.log("Delete it first if you want to re-seed.");
            process.exit(0);
        }

        // Deep clone the assessment
        const cloned = original.toObject();
        delete cloned._id;
        delete cloned.createdAt;
        delete cloned.updatedAt;
        delete cloned.__v;

        // Update title
        cloned.title = `${original.title} 360`;

        // Transform questions in each section
        if (cloned.sections) {
            cloned.sections = cloned.sections.map(section => {
                // Remove section _id so Mongoose generates new ones
                delete section._id;

                if (section.questions) {
                    section.questions = section.questions.map(q => {
                        delete q._id;
                        return {
                            ...q,
                            text: transformQuestionText(q.text),
                        };
                    });
                }

                // Also transform report questions if they exist
                if (section.report && section.report.questions) {
                    section.report.questions = section.report.questions.map(q => {
                        delete q._id;
                        return {
                            ...q,
                            text: transformQuestionText(q.text),
                        };
                    });
                }

                return section;
            });
        }

        const newAssessment = new Assessment(cloned);
        await newAssessment.save();

        console.log(`\n360 assessment created successfully!`);
        console.log(`Title: "${newAssessment.title}"`);
        console.log(`ID: ${newAssessment._id}`);
        console.log(`Sections: ${newAssessment.sections.length}`);

        let totalQuestions = 0;
        newAssessment.sections.forEach(s => {
            totalQuestions += s.questions ? s.questions.length : 0;
        });
        console.log(`Total questions: ${totalQuestions}`);
        console.log(`\nNote: Admin can manually edit 360 questions via the Questions admin page if auto-transformation needs adjustments.`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding 360 assessment:", error);
        process.exit(1);
    }
};

seed360Assessment();

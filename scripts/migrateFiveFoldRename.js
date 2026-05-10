/**
 * Rename "5-Fold" → "Five-Fold" and "5-fold" → "five-fold" in existing
 * Assessment and Result documents.
 *
 * Default is a dry run. Pass --apply to actually save changes.
 *
 * Usage:
 *   node scripts/migrateFiveFoldRename.js          (dry run)
 *   node scripts/migrateFiveFoldRename.js --apply  (writes changes)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assessment = require('../models/assessment');
const Result = require('../models/result');
const { dbConnection } = require('../database/config');

const REPLACEMENTS = [
    { from: /5-Fold/g, to: 'Five-Fold' },
    { from: /5-fold/g, to: 'five-fold' },
];

const apply = process.argv.includes('--apply');

const rewrite = (value) => {
    if (typeof value !== 'string') return { value, changed: false };
    let out = value;
    for (const { from, to } of REPLACEMENTS) {
        out = out.replace(from, to);
    }
    return { value: out, changed: out !== value };
};

const rewriteFields = (obj, fields, log) => {
    let changed = false;
    for (const f of fields) {
        const result = rewrite(obj[f]);
        if (result.changed) {
            log.push(`    ${f}: "${obj[f]}" → "${result.value}"`);
            obj[f] = result.value;
            changed = true;
        }
    }
    return changed;
};

const rewriteStringArray = (arr, label, log) => {
    if (!Array.isArray(arr)) return false;
    let changed = false;
    arr.forEach((item, i) => {
        const result = rewrite(item);
        if (result.changed) {
            log.push(`    ${label}[${i}]: "${item}" → "${result.value}"`);
            arr[i] = result.value;
            changed = true;
        }
    });
    return changed;
};

const rewriteQuestion = (q, label, log) => {
    let changed = false;
    if (rewriteFields(q, ['text'], log)) changed = true;
    if (Array.isArray(q.options)) {
        q.options.forEach((opt, i) => {
            if (rewriteFields(opt, ['text'], log.concat([`    ${label} option ${i}:`]))) changed = true;
        });
    }
    return changed;
};

const run = async () => {
    await dbConnection();
    console.log(`\n=== migrateFiveFoldRename — ${apply ? 'APPLY' : 'DRY RUN'} ===\n`);

    let assessmentsChanged = 0;
    const assessments = await Assessment.find({});

    for (const a of assessments) {
        const log = [];
        let changed = false;

        if (rewriteFields(a, ['title', 'subtitle', 'description'], log)) changed = true;

        if (a.welcomeIntro) {
            if (rewriteFields(a.welcomeIntro, ['intro', 'bulletsLead', 'callToAction'], log)) changed = true;
            if (rewriteStringArray(a.welcomeIntro.headings, 'welcomeIntro.headings', log)) changed = true;
            if (rewriteStringArray(a.welcomeIntro.closingParagraphs, 'welcomeIntro.closingParagraphs', log)) changed = true;
            if (Array.isArray(a.welcomeIntro.bullets)) {
                a.welcomeIntro.bullets.forEach((b, i) => {
                    if (rewriteFields(b, ['bold', 'text'], log.concat([`    bullets[${i}]:`]))) changed = true;
                });
            }
            if (changed) a.markModified('welcomeIntro');
        }

        if (Array.isArray(a.sections)) {
            a.sections.forEach((s, si) => {
                const sectionLog = [];
                let sectionChanged = false;
                if (rewriteFields(s, ['title', 'subtitle', 'description', 'reviewerDescription'], sectionLog)) sectionChanged = true;
                if (s.report) {
                    if (rewriteFields(s.report, ['intro'], sectionLog)) sectionChanged = true;
                    if (Array.isArray(s.report.questions)) {
                        s.report.questions.forEach((q, qi) => {
                            if (rewriteQuestion(q, `section[${si}].report.questions[${qi}]`, sectionLog)) sectionChanged = true;
                        });
                    }
                }
                if (Array.isArray(s.questions)) {
                    s.questions.forEach((q, qi) => {
                        if (rewriteQuestion(q, `section[${si}].questions[${qi}]`, sectionLog)) sectionChanged = true;
                    });
                }
                if (sectionChanged) {
                    log.push(`  section[${si}] (${s.customId} - ${s.title}):`);
                    log.push(...sectionLog);
                    changed = true;
                }
            });
            if (changed) a.markModified('sections');
        }

        if (changed) {
            assessmentsChanged++;
            console.log(`Assessment ${a._id} — "${a.title}":`);
            log.forEach(l => console.log(l));
            if (apply) await a.save();
        }
    }

    let resultsChanged = 0;
    const results = await Result.find({});
    for (const r of results) {
        const log = [];
        let changed = false;
        if (rewriteFields(r, ['title', 'content', 'category'], log)) changed = true;
        if (changed) {
            resultsChanged++;
            console.log(`Result ${r._id} (section=${r.sectionCustomId}, category=${r.category}):`);
            log.forEach(l => console.log(l));
            if (apply) await r.save();
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Assessments ${apply ? 'updated' : 'would update'}: ${assessmentsChanged}`);
    console.log(`Results ${apply ? 'updated' : 'would update'}: ${resultsChanged}`);
    if (!apply) console.log(`\nDry run only. Re-run with --apply to write changes.`);

    await mongoose.disconnect();
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});

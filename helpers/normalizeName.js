// Derive a usable { firstName, lastName } from whatever an upstream integration
// (currently LearnWorlds via Zapier) provides for a user's name.
//
// LearnWorlds frequently sends a single display-name field, or the Zap maps the
// name into the wrong slot — leaving firstName empty. An empty firstName breaks
// everything downstream that reads it: 360 invitation emails (which leaked a raw
// "{{revieweeName}}" token), the auto-generated "X's Team" group name, and the
// welcome email greeting. This normalizer guarantees a non-empty firstName
// whenever any name signal exists.
//
// Precedence:
//   1. An explicit, non-empty firstName wins.
//   2. Otherwise split a full-name field (fullName / name / username).
//   3. Otherwise promote a lone lastName into firstName (the observed mis-map).
//   4. Last resort: derive from the email local part.

const clean = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const looksLikeEmail = (v) => /\S+@\S+/.test(v);
const titleCase = (v) => v.replace(/\b\w/g, (c) => c.toUpperCase());

const splitFull = (full) => {
    const parts = clean(full).split(' ').filter(Boolean);
    return { first: parts.shift() || '', last: parts.join(' ') };
};

const normalizeName = ({ firstName, lastName, name, fullName, username, email } = {}) => {
    let first = clean(firstName);
    let last = clean(lastName);

    // 2. firstName empty → try any full-name field the integration might send.
    if (!first) {
        const full = [fullName, name, username].map(clean).find((v) => v && !looksLikeEmail(v));
        if (full) {
            const s = splitFull(full);
            first = s.first;
            if (!last) last = s.last;
        }
    }

    // 3. Name landed entirely in lastName (the LearnWorlds mis-map we observed).
    if (!first && last) {
        const s = splitFull(last);
        first = s.first;
        last = s.last;
    }

    // 4. Last resort: turn the email local part into a name (e.g. dave.bowen → Dave Bowen).
    if (!first) {
        const local = (clean(email).split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
        if (local) {
            const s = splitFull(titleCase(local));
            first = s.first;
            if (!last) last = s.last;
        }
    }

    return { firstName: first, lastName: last };
};

module.exports = { normalizeName };

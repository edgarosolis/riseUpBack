const { response } = require('express');
const { provisionUser } = require('../services/userProvisioningService');
const { sendWelcomeEmail } = require('../services/emailService');
const WebhookEventLog = require('../models/webhookEventLog');

const SOURCE = 'zapier-learnworlds';
const ASSESSMENT_LOGIN_URL = process.env.ASSESSMENT_LOGIN_URL || 'https://assessments.theriseupculture.com/login';

const parseProductList = (raw) =>
    String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const lookupAssessmentForProduct = (productId) => {
    const kc = parseProductList(process.env.LEARNWORLDS_KC_PRODUCT_IDS);
    const threeSixty = parseProductList(process.env.LEARNWORLDS_360_PRODUCT_IDS);
    const id = String(productId || '').trim();
    if (!id) return null;
    if (threeSixty.includes(id)) return { has360: true, assessmentName: 'your Kingdom Calling 360 Assessment' };
    if (kc.includes(id)) return { has360: false, assessmentName: 'your Kingdom Calling Assessment' };
    return null;
};

const buildLoginUrl = (email) => {
    const base = ASSESSMENT_LOGIN_URL;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}email=${encodeURIComponent(email)}`;
};

const provision = async (req, res = response) => {
    const providedKey = req.header('x-rise-up-key');
    const expectedKey = process.env.RISE_UP_INTEGRATION_KEY;
    if (!expectedKey || providedKey !== expectedKey) {
        return res.status(401).json({ status: 'unauthorized' });
    }

    const { email, firstName, lastName, productId, eventId } = req.body || {};

    if (!email || !productId || !eventId) {
        return res.status(400).json({
            status: 'invalid_payload',
            msg: 'email, productId, and eventId are required',
        });
    }

    const mapping = lookupAssessmentForProduct(productId);
    if (!mapping) {
        return res.status(400).json({
            status: 'unknown_product',
            msg: `productId "${productId}" is not mapped to a Rise Up assessment`,
        });
    }

    const existingLog = await WebhookEventLog.findOne({ source: SOURCE, eventId });
    if (existingLog) {
        return res.json({
            status: 'ok',
            action: 'duplicate',
            userId: existingLog.userId || null,
        });
    }

    let result;
    try {
        result = await provisionUser({
            email,
            firstName,
            lastName,
            has360: mapping.has360,
        });
    } catch (err) {
        console.log('provisionUser error in Zapier controller:', err.message);
        return res.status(500).json({ status: 'provision_failed', msg: err.message });
    }

    const { user, wasCreated, wasUpgraded } = result;
    const action = wasCreated ? 'created' : wasUpgraded ? 'upgraded' : 'noop';

    if (wasCreated) {
        try {
            await sendWelcomeEmail(
                user.email,
                user.firstName,
                buildLoginUrl(user.email),
                mapping.assessmentName,
            );
        } catch (err) {
            console.log('Welcome email failed (user still provisioned):', err.message);
        }
    }

    try {
        await WebhookEventLog.create({
            source: SOURCE,
            eventId,
            email: user.email,
            productId,
            action,
            userId: user._id,
            payload: req.body,
        });
    } catch (err) {
        // Duplicate-key (concurrent retry) — treat as duplicate, not a failure.
        if (err && err.code === 11000) {
            return res.json({ status: 'ok', action: 'duplicate', userId: user._id });
        }
        console.log('WebhookEventLog write failed:', err.message);
    }

    return res.json({
        status: 'ok',
        action,
        userId: user._id,
    });
};

module.exports = { provision };

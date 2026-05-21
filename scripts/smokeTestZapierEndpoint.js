/**
 * Smoke test for the Zapier provision endpoint.
 *
 * Stubs out the DB-touching modules so we can exercise the controller's
 * auth + payload validation + product mapping without a Mongo connection.
 *
 * Run: node scripts/smokeTestZapierEndpoint.js
 */

const Module = require('module');
const originalRequire = Module.prototype.require;

// Stubs
const sentWelcomeEmails = [];
const provisionedUsers = [];
const logEntries = [];

const userProvisioningStub = {
    provisionUser: async ({ email, firstName, lastName, has360 }) => {
        provisionedUsers.push({ email, firstName, lastName, has360 });
        return {
            user: {
                _id: 'stub-user-id',
                email: String(email).toLowerCase(),
                firstName,
                lastName,
                has360,
            },
            wasCreated: true,
            wasUpgraded: false,
        };
    },
};

const emailServiceStub = {
    sendWelcomeEmail: async (email, firstName, loginUrl, assessmentName) => {
        sentWelcomeEmails.push({ email, firstName, loginUrl, assessmentName });
        return true;
    },
};

const webhookEventLogStub = {
    findOne: async () => null,
    create: async (doc) => {
        logEntries.push(doc);
        return doc;
    },
};

Module.prototype.require = function (id) {
    if (id.endsWith('userProvisioningService')) return userProvisioningStub;
    if (id.endsWith('emailService')) return emailServiceStub;
    if (id.endsWith('webhookEventLog')) return webhookEventLogStub;
    return originalRequire.call(this, id);
};

process.env.RISE_UP_INTEGRATION_KEY = 'test-secret';
process.env.LEARNWORLDS_KC_PRODUCT_IDS = 'kc-product-1, kc-product-2';
process.env.LEARNWORLDS_360_PRODUCT_IDS = 'bundle-product-1,360-product-1';
process.env.ASSESSMENT_LOGIN_URL = 'https://assessments.theriseupculture.com/login';

const { provision } = require('../controllers/zapierProvisionController');

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body) => {
        res.body = body;
        return res;
    };
    return res;
};

const callEndpoint = async ({ headers = {}, body = {} } = {}) => {
    const req = {
        header: (name) => headers[name.toLowerCase()] || headers[name],
        body,
    };
    const res = mockRes();
    await provision(req, res);
    return { statusCode: res.statusCode, body: res.body };
};

const assert = (cond, message) => {
    if (!cond) {
        console.error('FAIL:', message);
        process.exit(1);
    }
    console.log('ok  :', message);
};

(async () => {
    // 1. Missing key → 401
    let result = await callEndpoint({ body: { email: 'a@b.com' } });
    assert(result.statusCode === 401, 'missing key returns 401');

    // 2. Wrong key → 401
    result = await callEndpoint({
        headers: { 'x-rise-up-key': 'wrong' },
        body: { email: 'a@b.com', productId: 'kc-product-1', eventId: 'evt-1' },
    });
    assert(result.statusCode === 401, 'wrong key returns 401');

    // 3. Missing payload → 400
    result = await callEndpoint({
        headers: { 'x-rise-up-key': 'test-secret' },
        body: {},
    });
    assert(result.statusCode === 400 && result.body.status === 'invalid_payload', 'missing fields returns 400 invalid_payload');

    // 4. Unknown productId → 400
    result = await callEndpoint({
        headers: { 'x-rise-up-key': 'test-secret' },
        body: { email: 'a@b.com', productId: 'mystery', eventId: 'evt-2' },
    });
    assert(result.statusCode === 400 && result.body.status === 'unknown_product', 'unknown productId returns 400 unknown_product');

    // 5. KC product → user provisioned with has360: false, welcome email sent
    sentWelcomeEmails.length = 0;
    provisionedUsers.length = 0;
    logEntries.length = 0;
    result = await callEndpoint({
        headers: { 'x-rise-up-key': 'test-secret' },
        body: { email: 'KC@Buyer.com', firstName: 'Kay', lastName: 'See', productId: 'kc-product-1', eventId: 'evt-kc-1' },
    });
    assert(result.statusCode === 200, 'KC product returns 200');
    assert(result.body.action === 'created', 'KC product action is created');
    assert(provisionedUsers.length === 1 && provisionedUsers[0].has360 === false, 'KC product provisions with has360 false');
    assert(sentWelcomeEmails.length === 1 && sentWelcomeEmails[0].email === 'kc@buyer.com', 'welcome email sent to lowercased email');
    assert(sentWelcomeEmails[0].loginUrl.includes('email=kc%40buyer.com'), 'login URL includes encoded email');
    assert(logEntries.length === 1 && logEntries[0].eventId === 'evt-kc-1', 'event logged once');

    // 6. 360 product (also covers bundle, since they share the same env list) → has360: true
    sentWelcomeEmails.length = 0;
    provisionedUsers.length = 0;
    result = await callEndpoint({
        headers: { 'x-rise-up-key': 'test-secret' },
        body: { email: 'bundle@buyer.com', firstName: 'Three', lastName: 'Sixty', productId: 'bundle-product-1', eventId: 'evt-bundle-1' },
    });
    assert(result.statusCode === 200 && provisionedUsers[0].has360 === true, '360/bundle product provisions with has360 true');

    // 7. KC product with whitespace and trimming
    result = await callEndpoint({
        headers: { 'x-rise-up-key': 'test-secret' },
        body: { email: 'b@b.com', productId: 'kc-product-2', eventId: 'evt-kc-2' },
    });
    assert(result.statusCode === 200, 'second KC product (with whitespace in env list) is recognized');

    console.log('\nAll smoke tests passed.');
    process.exit(0);
})().catch((err) => {
    console.error('Test crashed:', err);
    process.exit(1);
});

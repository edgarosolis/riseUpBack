const express = require('express');
const router = express.Router();
const { provision } = require('../controllers/zapierProvisionController');

router.post('/zapier/provision', provision);

module.exports = router;

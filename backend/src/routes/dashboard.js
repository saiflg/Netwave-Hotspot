const express  = require('express');
const dashCtrl = require('../controllers/dashboard');
const { protect, staffOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, staffOnly);
router.get('/',       dashCtrl.getDashboard);
router.get('/health', dashCtrl.getSystemHealth);

module.exports = router;

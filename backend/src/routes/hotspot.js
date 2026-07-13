const express     = require('express');
const hotspotCtrl = require('../controllers/hotspot');
const { protect, staffOnly } = require('../middleware/auth');

const router = express.Router();

// Public — captive portal
router.post('/login',              hotspotCtrl.hotspotLogin);
router.post('/logout',             hotspotCtrl.hotspotLogout);
router.post('/qr/:token',          hotspotCtrl.qrLogin);
router.get( '/config',             hotspotCtrl.getPortalConfig);
router.get( '/session/:sessionId', hotspotCtrl.sessionStatus);

// Admin
router.get('/active-sessions', protect, staffOnly, hotspotCtrl.getActiveSessions);

module.exports = router;

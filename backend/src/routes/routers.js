const express     = require('express');
const routerCtrl  = require('../controllers/routers');
const { protect, adminOnly, staffOnly } = require('../middleware/auth');

const router = express.Router();

// ISP check — public (called before payment, no auth needed)
router.get('/isp-status', routerCtrl.checkISP);

// Test connection from form (before router is saved)
router.post('/test-raw', protect, adminOnly, routerCtrl.testConnectionRaw);

// Protected routes
router.use(protect);
router.get('/',                    staffOnly, routerCtrl.getRouters);
router.post('/',                   adminOnly, routerCtrl.createRouter);
router.get('/:id',                 staffOnly, routerCtrl.getRouter);
router.put('/:id',                 adminOnly, routerCtrl.updateRouter);
router.delete('/:id',              adminOnly, routerCtrl.deleteRouter);
router.post('/:id/test',           staffOnly, routerCtrl.testConnection);
router.get('/:id/heartbeat',       staffOnly, routerCtrl.heartbeat);
router.get('/:id/online-users',    staffOnly, routerCtrl.getOnlineUsers);
router.get('/:id/stats',           staffOnly, routerCtrl.getRouterStats);
router.get('/:id/profiles',        staffOnly, routerCtrl.getProfiles);
router.post('/:id/reboot',         adminOnly, routerCtrl.rebootRouter);
router.post('/:id/backup',         adminOnly, routerCtrl.backupRouter);
router.post('/:id/disconnect-user',  adminOnly, routerCtrl.disconnectUser);
router.post('/:id/configure-portal', adminOnly, routerCtrl.configurePortal);
router.get( '/:id/walled-garden',    staffOnly, routerCtrl.getWalledGarden);

module.exports = router;

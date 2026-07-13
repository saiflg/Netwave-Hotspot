const express  = require('express');
const authCtrl = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/register',        authCtrl.register);
router.post('/login',           authCtrl.login);
router.get( '/verify/:token',   authCtrl.verifyEmail);
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/reset-password',  authCtrl.resetPassword);

// Protected
router.get( '/me',              protect, authCtrl.getMe);
router.put( '/change-password', protect, authCtrl.changePassword);
router.post('/logout',          protect, authCtrl.logout);
router.put( '/profile',         protect, authCtrl.updateProfile);
router.put( '/email',           protect, authCtrl.updateEmail);
router.post('/test-email',      protect, authCtrl.sendTestEmail);

module.exports = router;
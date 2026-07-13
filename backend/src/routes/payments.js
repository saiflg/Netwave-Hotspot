const express  = require('express');
const payCtrl  = require('../controllers/payments');
const { protect, staffOnly } = require('../middleware/auth');

const router = express.Router();

// Webhooks — raw body (no JSON parsing)
router.post('/webhook/paystack',    payCtrl.paystackWebhook);
router.post('/webhook/flutterwave', payCtrl.flutterwaveWebhook);

// Payment init/verify — public (guests can pay without account)
router.post('/paystack/init',              payCtrl.initPaystack);
router.get( '/paystack/verify/:reference', payCtrl.verifyPaystack);
router.post('/flutterwave/init',           payCtrl.initFlutterwave);
router.get( '/flutterwave/verify',         payCtrl.verifyFlutterwave);

// Protected
router.use(protect);
router.get('/',    staffOnly, payCtrl.getPayments);
router.get('/:id',            payCtrl.getPayment);

module.exports = router;

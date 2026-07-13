/**
 * Payment Controller — Fixed
 * Fix: After successful payment, auto-login the session immediately
 * Fix: Switch to PostgreSQL (Neon) support
 */

const crypto = require('crypto');
const axios  = require('axios');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { prisma }          = require('../config/database');
const { MikroTikService } = require('../services/mikrotik');
const emailSvc       = require('../services/email');
const { logger }     = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────

// ─── ISP Availability Check ───────────────────────────────────────────────────
async function verifyISPAvailability(routerId) {
  try {
    const where  = routerId ? { id: routerId, isActive: true } : { isActive: true, isOnline: true };
    const router = await prisma.router.findFirst({ where, orderBy: { lastSeen: 'desc' } });
    if (!router) return { available: false, message: 'No active router found. Please contact support.' };

    const svc    = new MikroTikService(router);
    const result = await svc.checkISPAvailability();
    return result;
  } catch (e) {
    // If ISP check itself throws (e.g. routeros-client not installed),
    // allow payment to proceed — don't block sales due to monitoring issues
    return { available: true, message: 'ISP check skipped (monitoring unavailable)' };
  }
}

const getSettings = async () => {
  const rows = await prisma.setting.findMany({ where: { group: 'payment' } });
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
};

const generateCode = (prefix = '', length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = prefix ? `${prefix.toUpperCase()}-` : '';
  for (let i = 0; i < length; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
};

const generateQR = async (token) => {
  const base = process.env.CAPTIVE_PORTAL_URL || process.env.APP_URL || 'http://localhost:5000';
  const url  = `${base}/auth/qr/${token}`;
  try { return await QRCode.toDataURL(url, { width: 300, margin: 2 }); }
  catch { return null; }
};

// ─── Provision voucher after payment ─────────────────────────────────────
async function provisionVoucher(payment, metadata = {}) {
  const plan = await prisma.internetPlan.findUnique({ where: { id: payment.planId } });
  if (!plan) throw new Error(`Plan ${payment.planId} not found`);

  const code    = generateCode('NW', 8);
  const qrToken = uuidv4();
  const qrCode  = await generateQR(qrToken);

  const voucher = await prisma.voucher.create({
    data: {
      code,
      qrToken,
      qrCode,
      planId:              plan.id,
      price:               payment.amount,
      status:              'UNUSED',
      type:                'TIME',
      activateOnFirstLogin: true,
      expiresAt:           null,
      customerId:          payment.userId || null,
    },
    include: { plan: true },
  });

  logger.info(`Voucher provisioned: ${code} for payment ${payment.reference}`);
  return voucher;
}

// ─── AUTO-LOGIN after payment ─────────────────────────────────────────────
// Activates the voucher and creates a session immediately
// so the user is logged in as soon as they return from the payment page
async function autoActivateVoucher(voucher) {
  if (voucher.status !== 'UNUSED') return voucher;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (voucher.plan?.validity || 1));

  const activated = await prisma.voucher.update({
    where:   { id: voucher.id },
    data:    { status: 'ACTIVE', activatedAt: new Date(), expiresAt },
    include: { plan: true },
  });

  // Create a session record so the dashboard shows it active
  await prisma.hotspotSession.create({
    data: {
      voucherId: voucher.id,
      isActive:  true,
    },
  });

  logger.info(`Auto-activated voucher: ${voucher.code} expires ${expiresAt.toISOString()}`);
  return activated;
}

// ─── INIT PAYSTACK ────────────────────────────────────────────────────────
exports.initPaystack = async (req, res, next) => {
  try {
    const { planId, email, name, phone, routerId } = req.body;
    const settings = await getSettings();
    if (settings.paystack_enabled !== 'true') return res.status(400).json({ success: false, message: 'Paystack is not enabled.' });

    // ── ISP Availability Check ────────────────────────────────────────────
    const isp = await verifyISPAvailability(routerId);
    if (!isp.available) {
      return res.status(503).json({
        success:  false,
        message:  isp.message || 'Internet service is temporarily unavailable. Please try again later.',
        code:     'ISP_UNAVAILABLE',
      });
    }

    const plan = await prisma.internetPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const reference = `NW-${uuidv4().slice(0, 8).toUpperCase()}-${Date.now()}`;
    const payment   = await prisma.payment.create({
      data: { reference, userId: req.user?.id || null, planId, amount: plan.price, currency: 'NGN', gateway: 'PAYSTACK', status: 'PENDING' },
    });

    const secretKey = settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY;
    const response  = await axios.post('https://api.paystack.co/transaction/initialize', {
      email:        email || req.user?.email,
      amount:       Math.round(plan.price * 100),
      reference,
      metadata:     { planId, paymentId: payment.id, name, phone, userId: req.user?.id || null },
      callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
    }, { headers: { Authorization: `Bearer ${secretKey}` } });

    if (!response.data.status) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      return res.status(400).json({ success: false, message: 'Payment initialization failed.' });
    }

    res.json({ success: true, data: { authorizationUrl: response.data.data.authorization_url, accessCode: response.data.data.access_code, reference, paymentId: payment.id } });
  } catch (error) { next(error); }
};

// ─── VERIFY PAYSTACK ──────────────────────────────────────────────────────
exports.verifyPaystack = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const settings  = await getSettings();
    const secretKey = settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY;

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const txData = response.data.data;
    if (!txData || txData.status !== 'success') {
      await prisma.payment.updateMany({ where: { reference }, data: { status: 'FAILED' } });
      return res.status(400).json({ success: false, message: 'Payment was not successful.' });
    }

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    // Already processed — return existing voucher
    if (payment.status === 'SUCCESS') {
      const voucher = await prisma.voucher.findUnique({ where: { id: payment.voucherId }, include: { plan: true } });
      return res.json({ success: true, message: 'Payment already processed.', data: { voucher, autoLogin: true } });
    }

    // Provision new voucher
    let voucher = await provisionVoucher(payment, txData.metadata);

    // ── AUTO-ACTIVATE: start the session immediately ──────────────────────
    voucher = await autoActivateVoucher(voucher);

    await prisma.payment.update({
      where: { reference },
      data:  { status: 'SUCCESS', gatewayRef: txData.id.toString(), gatewayData: JSON.stringify(txData), paidAt: new Date(), voucherId: voucher.id },
    });

    // 📧 Send receipt + voucher email (non-blocking)
    const customerEmail = txData.customer?.email || req.user?.email;
    const customerName  = txData.metadata?.name || txData.customer?.name || 'Customer';
    if (customerEmail) {
      // Receipt email
      emailSvc.sendPaymentReceipt(
        { email: customerEmail, firstName: customerName, lastName: '' },
        { ...payment, status: 'SUCCESS', paidAt: new Date() },
        voucher.plan?.name || '—'
      ).catch(e => logger.warn('Receipt email failed:', e.message));

      // Voucher confirmation email
      emailSvc.sendVoucherEmail(customerEmail, customerName, voucher, voucher.plan)
        .catch(e => logger.warn('Voucher email failed:', e.message));
    }

    res.json({
      success:   true,
      message:   'Payment successful! Your session has been activated.',
      data: {
        voucher,
        autoLogin: true,         // tells frontend to show "connected" state
        sessionActive: true,
        payment: { reference, amount: payment.amount },
      },
    });
  } catch (error) { next(error); }
};

// ─── PAYSTACK WEBHOOK ─────────────────────────────────────────────────────
exports.paystackWebhook = async (req, res, next) => {
  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const hash   = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).json({ success: false });

    const event = JSON.parse(req.body.toString());
    logger.info('Paystack webhook:', event.event);

    if (event.event === 'charge.success') {
      const { reference } = event.data;
      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (payment && payment.status !== 'SUCCESS') {
        let voucher = await provisionVoucher(payment, event.data.metadata);
        voucher = await autoActivateVoucher(voucher);
        await prisma.payment.update({
          where: { reference },
          data:  { status: 'SUCCESS', gatewayRef: event.data.id.toString(), gatewayData: JSON.stringify(event.data), paidAt: new Date(), voucherId: voucher.id },
        });
      }
    }
    res.sendStatus(200);
  } catch (error) { logger.error('Webhook error:', error); res.sendStatus(200); }
};

// ─── INIT FLUTTERWAVE ─────────────────────────────────────────────────────
exports.initFlutterwave = async (req, res, next) => {
  try {
    const { planId, email, name, phone, routerId } = req.body;
    const settings = await getSettings();
    if (settings.flutterwave_enabled !== 'true') return res.status(400).json({ success: false, message: 'Flutterwave is not enabled.' });

    // ── ISP Availability Check ────────────────────────────────────────────
    const isp = await verifyISPAvailability(routerId);
    if (!isp.available) {
      return res.status(503).json({
        success:  false,
        message:  isp.message || 'Internet service is temporarily unavailable. Please try again later.',
        code:     'ISP_UNAVAILABLE',
      });
    }

    const plan  = await prisma.internetPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const txRef   = `NW-FLW-${uuidv4().slice(0, 8).toUpperCase()}-${Date.now()}`;
    const payment = await prisma.payment.create({
      data: { reference: txRef, userId: req.user?.id || null, planId, amount: plan.price, currency: 'NGN', gateway: 'FLUTTERWAVE', status: 'PENDING' },
    });

    const secretKey = settings.flutterwave_secret_key || process.env.FLUTTERWAVE_SECRET_KEY;
    const response  = await axios.post('https://api.flutterwave.com/v3/payments', {
      tx_ref:        txRef,
      amount:        plan.price,
      currency:      'NGN',
      redirect_url:  `${process.env.FRONTEND_URL}/payment/verify-flw`,
      customer:      { email: email || req.user?.email, name, phone_number: phone },
      customizations:{ title: 'Blue Dot Networks', description: `Purchase ${plan.name}` },
      meta:          { planId, paymentId: payment.id, userId: req.user?.id || null },
    }, { headers: { Authorization: `Bearer ${secretKey}` } });

    if (response.data.status !== 'success') return res.status(400).json({ success: false, message: 'Payment initialization failed.' });
    res.json({ success: true, data: { paymentLink: response.data.data.link, txRef, paymentId: payment.id } });
  } catch (error) { next(error); }
};

// ─── VERIFY FLUTTERWAVE ───────────────────────────────────────────────────
exports.verifyFlutterwave = async (req, res, next) => {
  try {
    const { transaction_id, tx_ref } = req.query;
    const settings  = await getSettings();
    const secretKey = settings.flutterwave_secret_key || process.env.FLUTTERWAVE_SECRET_KEY;

    const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const txData = response.data.data;
    if (!txData || txData.status !== 'successful') {
      await prisma.payment.updateMany({ where: { reference: tx_ref }, data: { status: 'FAILED' } });
      return res.status(400).json({ success: false, message: 'Payment not successful.' });
    }

    const payment = await prisma.payment.findUnique({ where: { reference: tx_ref } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    if (payment.status === 'SUCCESS') {
      const voucher = await prisma.voucher.findUnique({ where: { id: payment.voucherId }, include: { plan: true } });
      return res.json({ success: true, data: { voucher, autoLogin: true } });
    }

    let voucher = await provisionVoucher(payment, txData.meta);
    voucher = await autoActivateVoucher(voucher);

    await prisma.payment.update({
      where: { reference: tx_ref },
      data:  { status: 'SUCCESS', gatewayRef: transaction_id, gatewayData: JSON.stringify(txData), paidAt: new Date(), voucherId: voucher.id },
    });

    res.json({ success: true, message: 'Payment verified! Session activated.', data: { voucher, autoLogin: true, sessionActive: true } });
  } catch (error) { next(error); }
};

// ─── FLW WEBHOOK ──────────────────────────────────────────────────────────
exports.flutterwaveWebhook = async (req, res, next) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const signature  = req.headers['verif-hash'];
    if (signature !== secretHash) return res.status(401).send('Unauthorized');

    const payload = req.body;
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const { tx_ref, id: transaction_id } = payload.data;
      const payment = await prisma.payment.findUnique({ where: { reference: tx_ref } });
      if (payment && payment.status !== 'SUCCESS') {
        let voucher = await provisionVoucher(payment, payload.data.meta);
        voucher = await autoActivateVoucher(voucher);
        await prisma.payment.update({
          where: { reference: tx_ref },
          data:  { status: 'SUCCESS', gatewayRef: transaction_id.toString(), gatewayData: JSON.stringify(payload.data), paidAt: new Date(), voucherId: voucher.id },
        });
      }
    }
    res.sendStatus(200);
  } catch (error) { logger.error('FLW Webhook error:', error); res.sendStatus(200); }
};

// ─── GET PAYMENTS ─────────────────────────────────────────────────────────
exports.getPayments = async (req, res, next) => {
  try {
    const { status, gateway, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status)  where.status  = status;
    if (gateway) where.gateway = gateway;
    if (req.user.role === 'CUSTOMER') where.userId = req.user.id;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, skip, take: parseInt(limit), include: { user: { select: { firstName: true, lastName: true, email: true } }, voucher: { select: { code: true, status: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.payment.count({ where }),
    ]);
    res.json({ success: true, data: { payments, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { user: true, voucher: { include: { plan: true } } } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, data: { payment } });
  } catch (error) { next(error); }
};

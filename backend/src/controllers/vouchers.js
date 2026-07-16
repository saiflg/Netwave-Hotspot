/**
 * Voucher Controller — Fixed version
 * - FK constraint fixed (no forced IDs)
 * - createMany replaced with loop for SQLite compat
 * - PDF/Excel export streams correctly
 */

const { prisma } = require('../config/database');
const QRCode     = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { generateVoucherPDF, generateVoucherExcel } = require('../services/export');
const { logger } = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateCode = (prefix = '', length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix ? `${prefix.toUpperCase()}-` : '';
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const generateQR = async (token) => {
  const base = process.env.CAPTIVE_PORTAL_URL || process.env.APP_URL || 'http://localhost:5000';
  const url  = `${base}/auth/qr/${token}`;
  try {
    return await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } });
  } catch (e) {
    logger.warn('QR generation failed:', e.message);
    return null;
  }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────
exports.getVouchers = async (req, res, next) => {
  try {
    const { status, planId, routerId, batchId, search, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status)   where.status   = status;
    if (planId)   where.planId   = planId;
    if (routerId) where.routerId = routerId;
    if (batchId)  where.batchId  = batchId;
    if (search)   where.code     = { contains: search.toUpperCase() };

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where, skip, take: parseInt(limit),
        include: {
          plan:     { select: { name: true, validity: true, validityLabel: true, downloadSpeed: true } },
          router:   { select: { name: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.voucher.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        vouchers,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (e) { next(e); }
};

// ─── CREATE SINGLE ────────────────────────────────────────────────────────────
exports.createVoucher = async (req, res, next) => {
  try {
    const { planId, routerId, prefix, customCode, price, type, deviceLimit, expiresAt } = req.body;

    if (!planId) return res.status(400).json({ success: false, message: 'planId is required.' });

    const plan = await prisma.internetPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found. Run the seed first: node src/utils/seed.js' });

    if (routerId) {
      const router = await prisma.router.findUnique({ where: { id: routerId } });
      if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    }

    const code = customCode ? customCode.toUpperCase().trim() : generateCode(prefix);
    const existing = await prisma.voucher.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ success: false, message: `Code "${code}" already exists.` });

    const qrToken = uuidv4();
    const qrCode  = await generateQR(qrToken);

    const voucher = await prisma.voucher.create({
      data: {
        code,
        qrToken,
        qrCode,
        planId,
        routerId:    routerId    || null,
        price:       price       ? parseFloat(price) : plan.price,
        type:        type        || 'TIME',
        deviceLimit: deviceLimit ? parseInt(deviceLimit) : 1,
        expiresAt:   expiresAt   ? new Date(expiresAt) : null,
        status:      'UNUSED',
        activateOnFirstLogin: true,
      },
      include: { plan: true, router: { select: { name: true } } },
    });

    res.status(201).json({ success: true, message: 'Voucher created.', data: { voucher } });
  } catch (e) { next(e); }
};

// ─── BULK GENERATE ────────────────────────────────────────────────────────────
exports.bulkGenerate = async (req, res, next) => {
  try {
    const { planId, routerId, prefix, count = 10, type, deviceLimit, batchName } = req.body;

    if (!planId) return res.status(400).json({ success: false, message: 'planId is required.' });
    const total = Math.min(parseInt(count) || 10, 500);

    const plan = await prisma.internetPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found. Run the seed: node src/utils/seed.js' });

    if (routerId) {
      const router = await prisma.router.findUnique({ where: { id: routerId } });
      if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    }

    const batchId = uuidv4();

    await prisma.voucherBatch.create({
      data: {
        id:       batchId,
        name:     batchName || `Batch ${new Date().toISOString().slice(0, 10)}`,
        planId,
        routerId: routerId || null,
        count:    total,
        prefix:   prefix   || null,
      },
    });

    const usedCodes = new Set();
    const created   = [];

    for (let i = 0; i < total; i++) {
      // Generate unique code
      let code;
      let tries = 0;
      do {
        code = generateCode(prefix);
        tries++;
        if (tries > 30) { code = generateCode(prefix, 10); break; }
      } while (
        usedCodes.has(code) ||
        (await prisma.voucher.findUnique({ where: { code } }))
      );
      usedCodes.add(code);

      const qrToken = uuidv4();
      const qrCode  = await generateQR(qrToken);

      const v = await prisma.voucher.create({
        data: {
          code,
          qrToken,
          qrCode,
          planId,
          routerId:    routerId    || null,
          batchId,
          price:       plan.price,
          type:        type        || 'TIME',
          deviceLimit: deviceLimit ? parseInt(deviceLimit) : 1,
          status:      'UNUSED',
          activateOnFirstLogin: true,
        },
      });
      created.push(v);

      if ((i + 1) % 50 === 0) logger.info(`Bulk generate: ${i + 1}/${total}`);
    }

    const vouchers = await prisma.voucher.findMany({
      where:   { batchId },
      include: { plan: { select: { name: true, validityLabel: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.status(201).json({
      success: true,
      message: `${created.length} vouchers generated.`,
      data:    { batchId, count: created.length, vouchers },
    });
  } catch (e) { next(e); }
};

// ─── GET SINGLE ───────────────────────────────────────────────────────────────
exports.getVoucher = async (req, res, next) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where:   { id: req.params.id },
      include: {
        plan:     true,
        router:   true,
        customer: { select: { firstName: true, lastName: true, email: true } },
        payment:  true,
        sessions: { take: 10, orderBy: { loginAt: 'desc' } },
      },
    });
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found.' });
    res.json({ success: true, data: { voucher } });
  } catch (e) { next(e); }
};

// ─── VALIDATE (public — captive portal) ───────────────────────────────────────
exports.validateVoucher = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Voucher code is required.' });

    const voucher = await prisma.voucher.findUnique({
      where:   { code: code.toUpperCase().trim() },
      include: { plan: true },
    });

    if (!voucher) return res.status(404).json({ success: false, message: 'Invalid voucher code. Please check and try again.' });
    if (voucher.status === 'SUSPENDED') return res.status(400).json({ success: false, message: 'This voucher has been suspended. Contact support.' });
    if (voucher.status === 'EXPIRED')   return res.status(400).json({ success: false, message: 'This voucher has expired. Please buy a new one.' });

    if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
      await prisma.voucher.update({ where: { id: voucher.id }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ success: false, message: 'This voucher has expired.' });
    }

    res.json({
      success: true,
      message: 'Voucher is valid.',
      data: {
        voucher: {
          code:      voucher.code,
          status:    voucher.status,
          plan:      voucher.plan,
          expiresAt: voucher.expiresAt,
        },
      },
    });
  } catch (e) { next(e); }
};

// ─── QR LOOKUP (public) ───────────────────────────────────────────────────────
exports.qrLogin = async (req, res, next) => {
  try {
    const { token } = req.params;
    const voucher   = await prisma.voucher.findUnique({ where: { qrToken: token }, include: { plan: true } });

    if (!voucher)                        return res.status(404).json({ success: false, message: 'Invalid QR code.' });
    if (voucher.status === 'SUSPENDED') return res.status(400).json({ success: false, message: 'Voucher suspended.' });
    if (voucher.status === 'EXPIRED')   return res.status(400).json({ success: false, message: 'Voucher expired.' });

    res.json({ success: true, data: { code: voucher.code, plan: voucher.plan } });
  } catch (e) { next(e); }
};

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed    = ['UNUSED', 'ACTIVE', 'EXPIRED', 'SUSPENDED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
    }
    const voucher = await prisma.voucher.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, message: `Voucher set to ${status}.`, data: { voucher } });
  } catch (e) { next(e); }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
exports.deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id } });
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found.' });
    if (voucher.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Cannot delete an active voucher. Suspend it first.' });
    }
    await prisma.hotspotSession.deleteMany({ where: { voucherId: voucher.id } });
    await prisma.voucher.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Voucher deleted.' });
  } catch (e) { next(e); }
};

// ─── EXPORT PDF ───────────────────────────────────────────────────────────────
exports.exportPDF = async (req, res, next) => {
  try {
    const { batchId, ids, status, limit } = req.query;

    // If specific IDs are selected, export those (ignores limit)
    // Otherwise respect the limit chosen by admin (default 50, max 500)
    const maxCount = ids
      ? ids.split(',').length
      : Math.min(parseInt(limit) || 50, 500);

    const where = {};
    if (batchId) where.batchId = batchId;
    if (ids)     where.id      = { in: ids.split(',') };
    if (status)  where.status  = status;

    const vouchers = await prisma.voucher.findMany({
      where,
      include: { plan: true },
      take:    maxCount,
      orderBy: { createdAt: 'desc' },
    });

    if (!vouchers.length) {
      return res.status(404).json({ success: false, message: 'No vouchers found to export.' });
    }

    const filename = `vouchers-${Date.now()}.pdf`;
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control',       'no-cache');
    res.setHeader('Transfer-Encoding',   'chunked');

    // Wait for BOTH the PDF generation AND the HTTP response stream to finish
    await new Promise(async (resolve, reject) => {
      res.on('finish', resolve);
      res.on('error',  reject);
      try {
        await generateVoucherPDF(vouchers, res);
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) { next(e); }
};

// ─── EXPORT EXCEL ─────────────────────────────────────────────────────────────
exports.exportExcel = async (req, res, next) => {
  try {
    const { batchId, ids, status } = req.query;
    const where = {};
    if (batchId) where.batchId = batchId;
    if (ids)     where.id      = { in: ids.split(',') };
    if (status)  where.status  = status;

    const vouchers = await prisma.voucher.findMany({
      where,
      include: { plan: true },
      take:    500,
      orderBy: { createdAt: 'desc' },
    });

    if (!vouchers.length) {
      return res.status(404).json({ success: false, message: 'No vouchers found to export.' });
    }

    const filename = `vouchers-${Date.now()}.xlsx`;
    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control',       'no-cache');
    res.setHeader('Transfer-Encoding',   'chunked');

    await new Promise(async (resolve, reject) => {
      res.on('finish', resolve);
      res.on('error',  reject);
      try {
        await generateVoucherExcel(vouchers, res);
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) { next(e); }
};

const express  = require('express');
const { protect, staffOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');
const { generateReportPDF } = require('../services/export');

const router = express.Router();
router.use(protect, staffOnly);

router.get('/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const df = {};
    if (from) df.gte = new Date(from);
    if (to)   df.lte = new Date(to);
    const dateWhere = Object.keys(df).length ? { createdAt: df } : {};

    const [revenue, payments, customers, vouchers, sessions] = await Promise.all([
      prisma.payment.aggregate({ where:{ ...dateWhere, status:'SUCCESS' }, _sum:{ amount:true }, _count:true }),
      prisma.payment.groupBy({ by:['status'], _count:true }),
      prisma.user.count({ where:{ ...dateWhere, role:'CUSTOMER' } }),
      prisma.voucher.groupBy({ by:['status'], _count:true }),
      prisma.hotspotSession.count({ where: dateWhere }),
    ]);
    res.json({ success:true, data:{ revenue: revenue._sum.amount || 0, paymentCount: revenue._count, payments, customers, vouchers, sessions } });
  } catch (e) { next(e); }
});

router.get('/export/pdf', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const df = {};
    if (from) df.gte = new Date(from);
    if (to)   df.lte = new Date(to);
    const where = { status:'SUCCESS', ...(Object.keys(df).length ? { paidAt: df } : {}) };

    const [revenue, payments] = await Promise.all([
      prisma.payment.aggregate({ where, _sum:{ amount:true }, _count:true }),
      prisma.payment.findMany({ where, take:100, include:{ user:{ select:{ firstName:true, lastName:true } }, voucher:{ select:{ code:true } } }, orderBy:{ paidAt:'desc' } }),
    ]);

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.pdf"`);
    res.setHeader('Cache-Control',       'no-cache');

    await generateReportPDF({
      title: `Revenue Report — ${from || 'All time'} to ${to || 'Now'}`,
      stats: {
        'Total Revenue': `₦${(revenue._sum.amount || 0).toLocaleString()}`,
        'Transactions':  revenue._count,
        'Period':        `${from || 'All time'} → ${to || 'Now'}`,
      },
      rows: payments.map(p => ({
        Reference: p.reference?.slice(0, 20) || '—',
        Customer:  p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Guest',
        Voucher:   p.voucher?.code || '—',
        Amount:    `₦${p.amount}`,
        Date:      p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—',
      })),
    }, res);
  } catch (e) { next(e); }
});

module.exports = router;

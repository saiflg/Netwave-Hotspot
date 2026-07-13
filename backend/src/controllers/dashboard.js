/**
 * Dashboard Controller — Blue Dot Networks
 * Provides all stats needed by the dashboard page
 */

const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

exports.getDashboard = async (req, res, next) => {
  try {
    const today     = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    const [
      revenueToday,
      revenueMonth,
      totalCustomers,
      activeSessions,
      voucherGroups,
      paymentsToday,
      recentPayments,
      routers,
    ] = await Promise.all([
      prisma.payment.aggregate({ where: { status:'SUCCESS', paidAt:{ gte: today } }, _sum:{ amount:true } }),
      prisma.payment.aggregate({ where: { status:'SUCCESS', paidAt:{ gte: monthStart } }, _sum:{ amount:true } }),
      prisma.user.count({ where: { role:'CUSTOMER' } }),
      prisma.hotspotSession.count({ where: { isActive: true } }),
      prisma.voucher.groupBy({ by:['status'], _count:{ _all: true } }),
      prisma.payment.count({ where: { status:'SUCCESS', paidAt:{ gte: today } } }),
      prisma.payment.findMany({
        where:   { status:'SUCCESS' },
        take:    10,
        orderBy: { paidAt:'desc' },
        include: {
          user:    { select:{ firstName:true, lastName:true } },
          voucher: { include:{ plan:{ select:{ name:true } } } },
        },
      }),
      prisma.router.findMany({ orderBy:{ createdAt:'desc' } }),
    ]);

    // Voucher sold count
    const vouchersSold = await prisma.voucher.count({ where: { status:{ not:'UNUSED' } } });
    const totalVouchers = await prisma.voucher.count();

    // Voucher breakdown map
    const voucherBreakdown = voucherGroups.reduce((acc, g) => {
      acc[g.status] = g._count._all;
      return acc;
    }, {});

    // 7-day revenue chart
    const revenueChart = [];
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const dEnd  = new Date(d); dEnd.setHours(23,59,59,999);
      const rev   = await prisma.payment.aggregate({
        where: { status:'SUCCESS', paidAt:{ gte: d, lte: dEnd } },
        _sum:  { amount: true },
      });
      revenueChart.push({
        date:    d.toLocaleDateString('en-NG', { month:'short', day:'numeric' }),
        revenue: rev._sum.amount || 0,
      });
    }

    // Router summary
    const onlineRouters  = routers.filter(r => r.isOnline).length;
    const offlineRouters = routers.length - onlineRouters;

    res.json({
      success: true,
      data: {
        revenueToday:    revenueToday._sum.amount  || 0,
        revenueMonth:    revenueMonth._sum.amount  || 0,
        totalCustomers,
        activeSessions,
        vouchersSold,
        totalVouchers,
        paymentsToday,
        voucherBreakdown,
        recentPayments,
        revenueChart,
        routers: {
          total:   routers.length,
          online:  onlineRouters,
          offline: offlineRouters,
          list:    routers,
        },
      },
    });
  } catch (err) { next(err); }
};

exports.getSystemHealth = async (req, res, next) => {
  try {
    const routers = await prisma.router.findMany({ where:{ isActive:true } });
    const online  = routers.filter(r => r.isOnline);
    res.json({
      success: true,
      data: {
        database:    'connected',
        routersTotal: routers.length,
        routersOnline: online.length,
        ispStatus:   online.some(r => r.hotspotRunning && r.wanActive) ? 'OK' : 'DEGRADED',
        timestamp:   new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
};

const express  = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        skip, take: parseInt(limit),
        include:{ user:{ select:{ firstName:true, lastName:true, email:true } } },
        orderBy:{ createdAt:'desc' },
      }),
      prisma.activityLog.count(),
    ]);
    res.json({ success:true, data:{ logs, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } } });
  } catch (e) { next(e); }
});

module.exports = router;

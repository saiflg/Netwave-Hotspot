const express  = require('express');
const { protect, adminOnly, staffOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();
router.use(protect);

router.get('/', staffOnly, async (req, res, next) => {
  try {
    const { isActive, routerId, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (routerId) where.routerId = routerId;
    const [sessions, total] = await Promise.all([
      prisma.hotspotSession.findMany({
        where, skip, take: parseInt(limit),
        include: { voucher:{ include:{ plan:true } }, router:{ select:{ name:true } } },
        orderBy: { loginAt: 'desc' },
      }),
      prisma.hotspotSession.count({ where }),
    ]);
    res.json({ success:true, data:{ sessions, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } } });
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    await prisma.hotspotSession.update({ where:{ id: req.params.id }, data:{ isActive:false, logoutAt: new Date() } });
    res.json({ success:true, message:'Session terminated.' });
  } catch (e) { next(e); }
});

module.exports = router;

const express  = require('express');
const { protect } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({ where:{ userId: req.user.id }, orderBy:{ createdAt:'desc' }, take:50 });
    res.json({ success:true, data:{ notifications: notifs, unread: notifs.filter(n => !n.isRead).length } });
  } catch (e) { next(e); }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where:{ userId: req.user.id }, data:{ isRead:true } });
    res.json({ success:true, message:'All marked as read.' });
  } catch (e) { next(e); }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({ where:{ id: req.params.id }, data:{ isRead:true } });
    res.json({ success:true });
  } catch (e) { next(e); }
});

module.exports = router;

const express  = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({ where:{ isActive:true }, orderBy:{ createdAt:'desc' } });
    res.json({ success:true, data:{ announcements } });
  } catch (e) { next(e); }
});

router.post('/', protect, adminOnly, async (req, res, next) => {
  try { const a = await prisma.announcement.create({ data: req.body }); res.status(201).json({ success:true, data:{ announcement:a } }); }
  catch (e) { next(e); }
});

router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try { const a = await prisma.announcement.update({ where:{ id: req.params.id }, data: req.body }); res.json({ success:true, data:{ announcement:a } }); }
  catch (e) { next(e); }
});

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try { await prisma.announcement.delete({ where:{ id: req.params.id } }); res.json({ success:true }); }
  catch (e) { next(e); }
});

module.exports = router;

const express  = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { const ads = await prisma.advertisement.findMany({ where:{ isActive:true } }); res.json({ success:true, data:{ ads } }); }
  catch (e) { next(e); }
});
router.post('/', protect, adminOnly, async (req, res, next) => {
  try { const ad = await prisma.advertisement.create({ data: req.body }); res.status(201).json({ success:true, data:{ ad } }); }
  catch (e) { next(e); }
});
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try { const ad = await prisma.advertisement.update({ where:{ id: req.params.id }, data: req.body }); res.json({ success:true, data:{ ad } }); }
  catch (e) { next(e); }
});
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try { await prisma.advertisement.delete({ where:{ id: req.params.id } }); res.json({ success:true }); }
  catch (e) { next(e); }
});

module.exports = router;

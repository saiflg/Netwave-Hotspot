const express  = require('express');
const { protect, adminOnly, staffOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

// Public — homepage fetches active plans
router.get('/', async (req, res, next) => {
  try {
    const plans = await prisma.internetPlan.findMany({ where:{ isActive:true }, orderBy:{ sortOrder:'asc' } });
    res.json({ success:true, data:{ plans } });
  } catch (e) { next(e); }
});

// Admin — all plans inc. inactive
router.get('/all', protect, staffOnly, async (req, res, next) => {
  try {
    const plans = await prisma.internetPlan.findMany({ orderBy:{ sortOrder:'asc' } });
    res.json({ success:true, data:{ plans } });
  } catch (e) { next(e); }
});

router.post('/',    protect, adminOnly, async (req, res, next) => {
  try { const p = await prisma.internetPlan.create({ data: req.body }); res.status(201).json({ success:true, message:'Plan created.', data:{ plan:p } }); }
  catch (e) { next(e); }
});

router.put('/:id',    protect, adminOnly, async (req, res, next) => {
  try { const p = await prisma.internetPlan.update({ where:{ id: req.params.id }, data: req.body }); res.json({ success:true, message:'Plan updated.', data:{ plan:p } }); }
  catch (e) { next(e); }
});

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try { await prisma.internetPlan.delete({ where:{ id: req.params.id } }); res.json({ success:true, message:'Plan deleted.' }); }
  catch (e) { next(e); }
});

module.exports = router;

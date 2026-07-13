const express  = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const pages = await prisma.legalPage.findMany({ where:{ isActive:true } });
    res.json({ success:true, data:{ pages } });
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const page = await prisma.legalPage.findUnique({ where:{ slug: req.params.slug } });
    if (!page) return res.status(404).json({ success:false, message:'Page not found.' });
    res.json({ success:true, data:{ page } });
  } catch (e) { next(e); }
});

router.put('/:slug', protect, adminOnly, async (req, res, next) => {
  try {
    const page = await prisma.legalPage.upsert({
      where:  { slug: req.params.slug },
      create: { slug: req.params.slug, ...req.body },
      update: req.body,
    });
    res.json({ success:true, message:'Page saved.', data:{ page } });
  } catch (e) { next(e); }
});

module.exports = router;

const express  = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();

// Public (branding/general only — homepage needs this)
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ where:{ group:{ in:['general','branding','seo','captive'] } } });
    const config   = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    res.json({ success:true, data:{ settings: config } });
  } catch (e) { next(e); }
});

// Admin — all settings grouped
router.get('/all', protect, adminOnly, async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const grouped  = settings.reduce((acc, s) => {
      if (!acc[s.group]) acc[s.group] = {};
      acc[s.group][s.key] = s.value;
      return acc;
    }, {});
    res.json({ success:true, data:{ settings: grouped } });
  } catch (e) { next(e); }
});

// Admin — update settings
router.put('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { settings, group = 'general' } = req.body;
    const ops = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where:  { key },
        create: { key, value: String(value), group },
        update: { value: String(value) },
      })
    );
    await Promise.all(ops);
    res.json({ success:true, message:'Settings saved.' });
  } catch (e) { next(e); }
});

module.exports = router;

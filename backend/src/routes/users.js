const express  = require('express');
const bcrypt   = require('bcryptjs');
const { protect, adminOnly, staffOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();
router.use(protect);

router.get('/', staffOnly, async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.OR = [
      { firstName: { contains: search } },
      { lastName:  { contains: search } },
      { email:     { contains: search } },
      { username:  { contains: search } },
    ];
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        select: { id:true, firstName:true, lastName:true, email:true, username:true,
                  phone:true, role:true, isActive:true, isVerified:true,
                  lastLogin:true, createdAt:true, plan:{ select:{ name:true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ success:true, data:{ users, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } } });
  } catch (e) { next(e); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { email, username, password, firstName, lastName, phone, role, planId, address } = req.body;
    const hashed = await bcrypt.hash(password || 'Blue Dot Networks@123', 12);
    const user   = await prisma.user.create({
      data: { email, username, password: hashed, firstName, lastName, phone, role: role || 'CUSTOMER', planId, address, isVerified: true },
    });
    try {
      const { sendWelcomeEmail } = require('../services/email');
      await sendWelcomeEmail(user);
    } catch {}
    const { password: _, ...userData } = user;
    res.status(201).json({ success:true, message:'User created.', data:{ user: userData } });
  } catch (e) { next(e); }
});

router.get('/:id', staffOnly, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { plan:true, payments:{ take:10, orderBy:{ createdAt:'desc' } }, sessions:{ take:10, orderBy:{ loginAt:'desc' } }, vouchers:{ take:10, orderBy:{ createdAt:'desc' } } },
    });
    if (!user) return res.status(404).json({ success:false, message:'User not found.' });
    const { password, ...userData } = user;
    res.json({ success:true, data:{ user: userData } });
  } catch (e) { next(e); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { password, ...data } = req.body;
    if (password) data.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({ where:{ id: req.params.id }, data });
    const { password: _, ...userData } = user;
    res.json({ success:true, message:'User updated.', data:{ user: userData } });
  } catch (e) { next(e); }
});

router.patch('/:id/toggle', adminOnly, async (req, res, next) => {
  try {
    const user    = await prisma.user.findUnique({ where:{ id: req.params.id } });
    const updated = await prisma.user.update({ where:{ id: req.params.id }, data:{ isActive: !user.isActive } });
    res.json({ success:true, message: updated.isActive ? 'User activated.' : 'User suspended.', data:{ isActive: updated.isActive } });
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    await prisma.user.delete({ where:{ id: req.params.id } });
    res.json({ success:true, message:'User deleted.' });
  } catch (e) { next(e); }
});

module.exports = router;

const express  = require('express');
const { protect, staffOnly } = require('../middleware/auth');
const { prisma } = require('../config/database');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const where   = req.user.role === 'CUSTOMER' ? { userId: req.user.id } : {};
    const tickets = await prisma.supportTicket.findMany({
      where, orderBy:{ createdAt:'desc' },
      include:{ user:{ select:{ firstName:true, lastName:true } }, replies:{ take:1, orderBy:{ createdAt:'desc' } } },
    });
    res.json({ success:true, data:{ tickets } });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const ticketNo = `TKT-${Date.now().toString().slice(-6)}`;
    const ticket   = await prisma.supportTicket.create({ data:{ ticketNo, userId: req.user.id, ...req.body } });
    try {
      const { sendTicketConfirmation } = require('../services/email');
      await sendTicketConfirmation(req.user, ticket);
    } catch {}
    res.status(201).json({ success:true, message:'Ticket created.', data:{ ticket } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include:{ user:true, replies:{ orderBy:{ createdAt:'asc' } } },
    });
    if (!ticket) return res.status(404).json({ success:false, message:'Ticket not found.' });
    res.json({ success:true, data:{ ticket } });
  } catch (e) { next(e); }
});

router.post('/:id/reply', async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN','SUPER_ADMIN','SUPPORT','MANAGER'].includes(req.user.role);
    const reply   = await prisma.ticketReply.create({
      data:{ ticketId: req.params.id, userId: req.user.id, message: req.body.message, isAdmin },
    });
    if (isAdmin) {
      try {
        const { sendTicketReply } = require('../services/email');
        const ticket = await prisma.supportTicket.findUnique({ where:{ id: req.params.id }, include:{ user:true } });
        await sendTicketReply(ticket.user, ticket, req.body.message);
      } catch {}
    }
    res.status(201).json({ success:true, data:{ reply } });
  } catch (e) { next(e); }
});

router.patch('/:id/status', staffOnly, async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.update({ where:{ id: req.params.id }, data:{ status: req.body.status } });
    res.json({ success:true, data:{ ticket } });
  } catch (e) { next(e); }
});

module.exports = router;

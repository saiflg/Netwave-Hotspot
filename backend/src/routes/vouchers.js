const express     = require('express');
const voucherCtrl = require('../controllers/vouchers');
const { protect, adminOnly, staffOnly } = require('../middleware/auth');

const router = express.Router();

// Public (captive portal uses these)
router.post('/validate', voucherCtrl.validateVoucher);
router.get('/qr/:token', voucherCtrl.qrLogin);

// Protected
router.use(protect);
router.get('/',             staffOnly, voucherCtrl.getVouchers);
router.post('/',            adminOnly, voucherCtrl.createVoucher);
router.post('/bulk',        adminOnly, voucherCtrl.bulkGenerate);
router.get('/export/pdf',   staffOnly, voucherCtrl.exportPDF);
router.get('/export/excel', staffOnly, voucherCtrl.exportExcel);
router.get('/:id',          staffOnly, voucherCtrl.getVoucher);
router.patch('/:id/status', adminOnly, voucherCtrl.updateStatus);
router.delete('/:id',       adminOnly, voucherCtrl.deleteVoucher);

module.exports = router;

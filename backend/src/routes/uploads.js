const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { protect, adminOnly } = require('../middleware/auth');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive:true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|svg|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files allowed'), ok);
  },
});

const router = express.Router();

router.post('/', protect, adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded.' });
  const url = `${process.env.APP_URL || ''}/uploads/${req.file.filename}`;
  res.json({ success:true, data:{ url, filename: req.file.filename } });
});

module.exports = router;

/**
 * Blue Dot Networks — Export Service
 * Fix: stream.on('finish') ensures all bytes are flushed before resolving
 */

const PDFDocument = require('pdfkit');
const ExcelJS     = require('exceljs');
const QRCode      = require('qrcode');
const path        = require('path');
const fs          = require('fs');

const LOGO_PATH = path.join(__dirname, '../../uploads/logo.jpg');

// ── QR PNG buffer ─────────────────────────────────────────────────────────────
async function makeQR(text) {
  try {
    return await QRCode.toBuffer(text, { width: 110, margin: 1, type: 'png' });
  } catch { return null; }
}

// ── VOUCHER PDF ───────────────────────────────────────────────────────────────
exports.generateVoucherPDF = async (vouchers, stream) => {
  const BASE = process.env.CAPTIVE_PORTAL_URL
    || process.env.APP_URL
    || 'http://localhost:5000';

  // Pre-generate ALL QR buffers before opening PDFKit
  const qrs = await Promise.all(
    vouchers.map(v =>
      v.qrToken ? makeQR(`${BASE}/auth/qr/${v.qrToken}`) : makeQR(v.code)
    )
  );

  const hasLogo = fs.existsSync(LOGO_PATH);

  return new Promise((resolve, reject) => {
    // CRITICAL: resolve on stream 'finish', NOT on doc 'end'
    // 'end' fires when PDFKit finishes writing — 'finish' fires when the
    // underlying HTTP socket has actually flushed all bytes to the client
    stream.on('finish', resolve);
    stream.on('error',  reject);

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    doc.on('error', reject);

    // Pipe AFTER attaching listeners
    doc.pipe(stream);

    try {
      const PW       = doc.page.width;
      const PH       = doc.page.height;
      const MARGIN   = 28;
      const HEADER_H = 52;
      const CARD_W   = 250;
      const CARD_H   = 162;
      const COLS     = 2;
      const GAP_X    = 12;
      const GAP_Y    = 10;
      const START_Y  = HEADER_H + 8;
      const AVAIL_H  = PH - START_Y - MARGIN;
      const ROWS_PER = Math.floor(AVAIL_H / (CARD_H + GAP_Y));
      const PER_PAGE = ROWS_PER * COLS;

      const STATUS_COLOR = {
        UNUSED:    '#6366F1',
        ACTIVE:    '#10B981',
        EXPIRED:   '#EF4444',
        SUSPENDED: '#F59E0B',
      };

      const drawHeader = () => {
        doc.rect(0, 0, PW, HEADER_H).fill('#0f172a');
        if (hasLogo) {
          try { doc.image(LOGO_PATH, MARGIN, 8, { height: 36 }); } catch {}
        }
        const textX = hasLogo ? MARGIN + 110 : MARGIN;
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff')
          .text('Blue Dot Networks', textX, 14);
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
          .text(
            `Vouchers · Generated: ${new Date().toLocaleString()} · Total: ${vouchers.length}`,
            textX, 32
          );
      };

      drawHeader();

      vouchers.forEach((v, idx) => {
        if (idx > 0 && idx % PER_PAGE === 0) {
          doc.addPage();
          drawHeader();
        }

        const pos = idx % PER_PAGE;
        const col = pos % COLS;
        const row = Math.floor(pos / COLS);
        const x   = MARGIN + col * (CARD_W + GAP_X);
        const y   = START_Y + row * (CARD_H + GAP_Y);
        const bc  = STATUS_COLOR[v.status] || '#6366F1';

        // Card background + border
        doc.roundedRect(x, y, CARD_W, CARD_H, 9)
          .fillAndStroke('#ffffff', bc);

        // Top strip
        doc.save()
          .roundedRect(x, y, CARD_W, 30, 9)
          .clip()
          .rect(x, y, CARD_W, 30)
          .fill('#1e3a5f')
          .restore();

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
          .text('Blue Dot Networks', x + 8, y + 8, { width: 160 });
        doc.font('Helvetica').fontSize(7).fillColor('#93c5fd')
          .text(v.plan?.name || 'Internet Plan', x + 8, y + 19, { width: 160 });
        doc.font('Helvetica-Bold').fontSize(7).fillColor(bc)
          .text(v.status, x + CARD_W - 58, y + 10, { width: 50, align: 'right' });

        // QR code
        const QR_SZ = 80;
        const QR_X  = x + CARD_W - QR_SZ - 7;
        const QR_Y  = y + 33;

        if (qrs[idx]) {
          doc.rect(QR_X - 2, QR_Y - 2, QR_SZ + 4, QR_SZ + 4).fill('#ffffff');
          doc.image(qrs[idx], QR_X, QR_Y, { width: QR_SZ, height: QR_SZ });
        } else {
          doc.rect(QR_X, QR_Y, QR_SZ, QR_SZ).fillAndStroke('#f1f5f9', '#e2e8f0');
          doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
            .text('QR unavailable', QR_X, QR_Y + 36, { width: QR_SZ, align: 'center' });
        }

        doc.font('Helvetica').fontSize(6).fillColor('#94a3b8')
          .text('Scan to connect', QR_X, QR_Y + QR_SZ + 2, { width: QR_SZ, align: 'center' });

        // Voucher code
        const LW = CARD_W - QR_SZ - 22;
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e293b')
          .text(v.code, x + 7, y + 35, { width: LW, characterSpacing: 1.5 });

        doc.moveTo(x + 7, y + 55)
          .lineTo(QR_X - 6, y + 55)
          .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        // Plan details
        const details = [
          ['Duration', v.plan?.validityLabel || '—'],
          ['Speed',    `${v.plan?.downloadSpeed || '?'}/${v.plan?.uploadSpeed || '?'} Mbps`],
          ['Data',     v.plan?.unlimited ? 'Unlimited' : `${v.plan?.dataLimit || '?'}MB`],
          ['Price',    `\u20A6${Number(v.price || 0).toLocaleString()}`],
        ];

        details.forEach(([lbl, val], di) => {
          const dy = y + 60 + di * 18;
          doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
            .text(lbl + ':', x + 7, dy, { width: 42 });
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
            .text(val, x + 52, dy, { width: LW - 46 });
        });

        // Footer bar
        const FY = y + CARD_H - 17;
        doc.rect(x, FY, CARD_W, 17).fill('#f8fafc');
        doc.font('Helvetica').fontSize(5.5).fillColor('#94a3b8')
          .text(`ID: ${(v.id || '').slice(0, 18).toUpperCase()}`, x + 6, FY + 5, { width: CARD_W / 2 - 8 });
        doc.font('Helvetica').fontSize(5.5).fillColor('#94a3b8')
          .text(
            `Exp: ${v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'On activation'}`,
            x + CARD_W / 2, FY + 5,
            { width: CARD_W / 2 - 8, align: 'right' }
          );
      });

      // End the PDF — 'finish' event on stream will resolve the Promise
      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

// ── VOUCHER EXCEL ─────────────────────────────────────────────────────────────
exports.generateVoucherExcel = async (vouchers, stream) => {
  const BASE = process.env.CAPTIVE_PORTAL_URL || process.env.APP_URL || '';

  const wb  = new ExcelJS.Workbook();
  wb.creator = 'Blue Dot Networks';
  wb.created = new Date();

  const ws = wb.addWorksheet('Vouchers', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'Code',         key: 'code',        width: 20 },
    { header: 'Plan',         key: 'plan',        width: 16 },
    { header: 'Price (₦)',    key: 'price',       width: 12 },
    { header: 'Duration',     key: 'duration',    width: 14 },
    { header: 'Speed',        key: 'speed',       width: 18 },
    { header: 'Data',         key: 'data',        width: 12 },
    { header: 'Status',       key: 'status',      width: 13 },
    { header: 'Activated At', key: 'activatedAt', width: 22 },
    { header: 'Expires At',   key: 'expiresAt',   width: 22 },
    { header: 'QR Link',      key: 'qrLink',      width: 55 },
    { header: 'Created At',   key: 'createdAt',   width: 22 },
    { header: 'Batch',        key: 'batchId',     width: 24 },
  ];

  // Header row styling
  ws.getRow(1).height = 28;
  ws.getRow(1).eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const SC = {
    UNUSED:    'FF6366F1',
    ACTIVE:    'FF10B981',
    EXPIRED:   'FFEF4444',
    SUSPENDED: 'FFF59E0B',
  };

  vouchers.forEach((v, i) => {
    const qrLink = v.qrToken ? `${BASE}/auth/qr/${v.qrToken}` : '';
    const row = ws.addRow({
      code:        v.code,
      plan:        v.plan?.name          || '—',
      price:       Number(v.price)       || 0,
      duration:    v.plan?.validityLabel  || '—',
      speed:       `${v.plan?.downloadSpeed || '?'}/${v.plan?.uploadSpeed || '?'} Mbps`,
      data:        v.plan?.unlimited ? 'Unlimited' : `${v.plan?.dataLimit || '?'}MB`,
      status:      v.status,
      activatedAt: v.activatedAt ? new Date(v.activatedAt).toLocaleString() : '—',
      expiresAt:   v.expiresAt   ? new Date(v.expiresAt).toLocaleString()   : 'On first use',
      qrLink,
      createdAt:   new Date(v.createdAt).toLocaleString(),
      batchId:     v.batchId || '—',
    });

    row.height = 20;

    if (i % 2 === 0) {
      row.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }

    row.getCell('code').font    = { bold: true, color: { argb: 'FF1e3a5f' }, name: 'Courier New' };
    row.getCell('price').numFmt = '#,##0.00';

    const sc = SC[v.status];
    if (sc) row.getCell('status').font = { bold: true, color: { argb: sc } };

    if (qrLink) {
      row.getCell('qrLink').value = { text: qrLink, hyperlink: qrLink };
      row.getCell('qrLink').font  = { color: { argb: 'FF6366F1' }, underline: true, size: 9 };
    }

    row.eachCell(c => {
      c.border = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      c.alignment = { vertical: 'middle' };
    });
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: ws.columns.length },
  };

  // ExcelJS writes and closes the stream internally
  await wb.xlsx.write(stream);
};

// ── REPORT PDF ────────────────────────────────────────────────────────────────
exports.generateReportPDF = (data, stream) => {
  return new Promise((resolve, reject) => {
    // Resolve when stream finishes, not when doc ends
    stream.on('finish', resolve);
    stream.on('error',  reject);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('error', reject);
    doc.pipe(stream);

    try {
      const hasLogo = fs.existsSync(LOGO_PATH);

      doc.rect(0, 0, doc.page.width, 65).fill('#0f172a');
      if (hasLogo) {
        try { doc.image(LOGO_PATH, 50, 10, { height: 44 }); } catch {}
      }
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text('Blue Dot Networks', 130, 16);
      doc.font('Helvetica').fontSize(10).fillColor('#93c5fd').text(data.title || 'Report', 130, 38);

      let y = 85;
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(`Generated: ${new Date().toLocaleString()}`, 50, y);
      y += 16;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      y += 14;

      if (data.stats) {
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e293b').text('Summary', 50, y);
        y += 18;
        Object.entries(data.stats).forEach(([k, v], i) => {
          const bx = 50 + (i % 2) * 250;
          const by = y + Math.floor(i / 2) * 48;
          doc.roundedRect(bx, by, 240, 40, 6).fillAndStroke('#f8fafc', '#e2e8f0');
          doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(k, bx + 10, by + 7);
          doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e3a5f').text(String(v), bx + 10, by + 18);
        });
        y += Math.ceil(Object.keys(data.stats).length / 2) * 48 + 16;
      }

      if (data.rows?.length) {
        if (y > 650) { doc.addPage(); y = 50; }
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e293b').text('Details', 50, y);
        y += 18;
        const cols = Object.keys(data.rows[0]);
        const cw   = Math.floor(495 / cols.length);
        doc.rect(50, y, 495, 22).fill('#1e3a5f');
        cols.forEach((c, ci) => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
            .text(c.toUpperCase(), 55 + ci * cw, y + 7, { width: cw - 4 });
        });
        y += 22;
        data.rows.forEach((row, ri) => {
          if (y > 730) { doc.addPage(); y = 50; }
          if (ri % 2 === 0) doc.rect(50, y, 495, 18).fill('#f8fafc');
          Object.values(row).forEach((val, ci) => {
            doc.font('Helvetica').fontSize(8).fillColor('#1e293b')
              .text(String(val || '—'), 55 + ci * cw, y + 5, { width: cw - 4, ellipsis: true });
          });
          y += 18;
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Export Service — PDF & Excel
 * Fix 1: Remove bufferPages — caused blank PDFs
 * Fix 2: Use synchronous card drawing, proper page overflow
 */

const PDFDocument = require('pdfkit');
const ExcelJS     = require('exceljs');
const QRCode      = require('qrcode');

// ── QR PNG buffer ─────────────────────────────────────────────────────────────
async function qrBuffer(text) {
  try {
    return await QRCode.toBuffer(text, { width: 120, margin: 1, type: 'png' });
  } catch { return null; }
}

// ── VOUCHER PDF ───────────────────────────────────────────────────────────────
exports.generateVoucherPDF = async (vouchers, stream) => {
  const BASE_URL = process.env.CAPTIVE_PORTAL_URL
    || process.env.APP_URL
    || 'http://localhost:5000';

  // Pre-generate all QR buffers BEFORE opening the stream
  const qrBuffers = await Promise.all(
    vouchers.map(v =>
      v.qrToken ? qrBuffer(`${BASE_URL}/auth/qr/${v.qrToken}`) : qrBuffer(v.code)
    )
  );

  return new Promise((resolve, reject) => {
    // NOTE: NO bufferPages — that was causing blank PDFs
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });

    doc.pipe(stream);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.on('end', resolve);

    try {
      const PAGE_W  = doc.page.width;   // 595
      const PAGE_H  = doc.page.height;  // 842

      const MARGIN  = 30;
      const CARD_W  = 248;
      const CARD_H  = 158;
      const COLS    = 2;
      const GAP_X   = 14;
      const GAP_Y   = 12;
      const HEAD_H  = 48;  // header strip height
      const BODY_Y  = HEAD_H + 10;  // where cards start

      const STATUS_COLORS = {
        UNUSED:    '#6366F1',
        ACTIVE:    '#10B981',
        EXPIRED:   '#EF4444',
        SUSPENDED: '#F59E0B',
      };

      // Rows per page
      const ROWS_PER_PAGE = Math.floor((PAGE_H - BODY_Y - MARGIN) / (CARD_H + GAP_Y));
      const CARDS_PER_PAGE = ROWS_PER_PAGE * COLS;

      // ── Draw page header ────────────────────────────────────────────
      const drawHeader = () => {
        doc.rect(0, 0, PAGE_W, HEAD_H).fill('#6366F1');
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#ffffff').text('Blue Dot Networks — Vouchers', MARGIN, 12);
        doc.font('Helvetica').fontSize(8).fillColor('#c7d2fe')
          .text(`Generated: ${new Date().toLocaleString()}   Total: ${vouchers.length}`, MARGIN, 30);
      };

      drawHeader();

      // ── Draw each card ──────────────────────────────────────────────
      vouchers.forEach((v, idx) => {
        // New page check
        if (idx > 0 && idx % CARDS_PER_PAGE === 0) {
          doc.addPage();
          drawHeader();
        }

        const posOnPage = idx % CARDS_PER_PAGE;
        const col       = posOnPage % COLS;
        const row       = Math.floor(posOnPage / COLS);

        const x = MARGIN + col * (CARD_W + GAP_X);
        const y = BODY_Y + row * (CARD_H + GAP_Y);

        const borderColor = STATUS_COLORS[v.status] || '#6366F1';

        // ── Card border + background ──────────────────────────────────
        doc.roundedRect(x, y, CARD_W, CARD_H, 8)
          .fillAndStroke('#ffffff', borderColor);

        // ── Top strip ─────────────────────────────────────────────────
        doc.save()
          .roundedRect(x, y, CARD_W, 28, 8)
          .clip()
          .rect(x, y, CARD_W, 28)
          .fill('#6366F1')
          .restore();

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
          .text('Blue Dot Networks', x + 8, y + 7, { width: 150 });
        doc.font('Helvetica').fontSize(7).fillColor('#c7d2fe')
          .text(v.plan?.name || 'Internet Plan', x + 8, y + 17, { width: 150 });
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
          .text(v.status, x + CARD_W - 54, y + 11, { width: 46, align: 'right' });

        // ── QR code ───────────────────────────────────────────────────
        const QR_SIZE = 82;
        const QR_X   = x + CARD_W - QR_SIZE - 8;
        const QR_Y   = y + 32;

        if (qrBuffers[idx]) {
          // Draw white background for QR
          doc.rect(QR_X - 2, QR_Y - 2, QR_SIZE + 4, QR_SIZE + 4).fill('#ffffff');
          doc.image(qrBuffers[idx], QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
        } else {
          doc.rect(QR_X, QR_Y, QR_SIZE, QR_SIZE).fillAndStroke('#f8fafc', '#e2e8f0');
          doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
            .text('QR not available', QR_X, QR_Y + QR_SIZE / 2 - 3, { width: QR_SIZE, align: 'center' });
        }

        doc.font('Helvetica').fontSize(6).fillColor('#94a3b8')
          .text('Scan to connect', QR_X, QR_Y + QR_SIZE + 2, { width: QR_SIZE, align: 'center' });

        // ── Voucher code ──────────────────────────────────────────────
        const LEFT_W = CARD_W - QR_SIZE - 24;
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b')
          .text(v.code, x + 8, y + 34, { width: LEFT_W, characterSpacing: 1 });

        // Divider
        doc.moveTo(x + 8, y + 55).lineTo(QR_X - 6, y + 55)
          .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        // ── Details ───────────────────────────────────────────────────
        const details = [
          ['Duration', v.plan?.validityLabel || '—'],
          ['Speed',    `${v.plan?.downloadSpeed || '?'}/${v.plan?.uploadSpeed || '?'} Mbps`],
          ['Data',     v.plan?.unlimited ? 'Unlimited' : `${v.plan?.dataLimit || '?'}MB`],
          ['Price',    `\u20A6${Number(v.price || 0).toLocaleString()}`],
        ];

        details.forEach(([lbl, val], di) => {
          const dy = y + 60 + di * 18;
          doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
            .text(lbl + ':', x + 8, dy, { width: 44 });
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
            .text(val, x + 54, dy, { width: LEFT_W - 48 });
        });

        // ── Footer ────────────────────────────────────────────────────
        const FY = y + CARD_H - 16;
        doc.rect(x, FY, CARD_W, 16).fill('#f8fafc');
        doc.font('Helvetica').fontSize(5.5).fillColor('#94a3b8')
          .text(`ID: ${(v.id || '').slice(0, 18).toUpperCase()}`, x + 6, FY + 5, { width: CARD_W / 2 - 8 });
        doc.font('Helvetica').fontSize(5.5).fillColor('#94a3b8')
          .text(
            `Exp: ${v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'On activation'}`,
            x + CARD_W / 2, FY + 5,
            { width: CARD_W / 2 - 8, align: 'right' }
          );
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ── VOUCHER EXCEL ─────────────────────────────────────────────────────────────
exports.generateVoucherExcel = async (vouchers, stream) => {
  const workbook   = new ExcelJS.Workbook();
  workbook.creator = 'Blue Dot Networks';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Vouchers', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Code',         key: 'code',        width: 20 },
    { header: 'Plan',         key: 'plan',        width: 16 },
    { header: 'Price (₦)',    key: 'price',       width: 12 },
    { header: 'Duration',     key: 'duration',    width: 14 },
    { header: 'Speed',        key: 'speed',       width: 16 },
    { header: 'Data',         key: 'data',        width: 12 },
    { header: 'Status',       key: 'status',      width: 12 },
    { header: 'Activated At', key: 'activatedAt', width: 22 },
    { header: 'Expires At',   key: 'expiresAt',   width: 22 },
    { header: 'QR Link',      key: 'qrLink',      width: 50 },
    { header: 'Created At',   key: 'createdAt',   width: 22 },
    { header: 'Batch ID',     key: 'batchId',     width: 24 },
  ];

  // Header styling
  sheet.getRow(1).height = 26;
  sheet.getRow(1).eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const STATUS_COLORS = { UNUSED:'FF6366F1', ACTIVE:'FF10B981', EXPIRED:'FFEF4444', SUSPENDED:'FFF59E0B' };
  const BASE_URL = process.env.CAPTIVE_PORTAL_URL || process.env.APP_URL || '';

  vouchers.forEach((v, i) => {
    const qrLink = v.qrToken ? `${BASE_URL}/auth/qr/${v.qrToken}` : '';

    const row = sheet.addRow({
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

    // Alternate row shade
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }

    // Code cell styling
    row.getCell('code').font    = { bold: true, color: { argb: 'FF6366F1' }, name: 'Courier New' };
    row.getCell('price').numFmt = '#,##0.00';

    // Status color
    const sc = STATUS_COLORS[v.status];
    if (sc) row.getCell('status').font = { bold: true, color: { argb: sc } };

    // QR link as hyperlink
    if (qrLink) {
      row.getCell('qrLink').value = { text: qrLink, hyperlink: qrLink };
      row.getCell('qrLink').font  = { color: { argb: 'FF6366F1' }, underline: true, size: 9 };
    }

    // Borders
    row.eachCell(cell => {
      cell.border    = { top:{ style:'thin', color:{ argb:'FFE2E8F0' } }, bottom:{ style:'thin', color:{ argb:'FFE2E8F0' } }, left:{ style:'thin', color:{ argb:'FFE2E8F0' } }, right:{ style:'thin', color:{ argb:'FFE2E8F0' } } };
      cell.alignment = { vertical: 'middle' };
    });
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: sheet.columns.length },
  };

  await workbook.xlsx.write(stream);
};

// ── REPORT PDF ────────────────────────────────────────────────────────────────
exports.generateReportPDF = (data, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.on('end', resolve);

    try {
      // Header
      doc.rect(0, 0, doc.page.width, 60).fill('#6366F1');
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text('Blue Dot Networks', 50, 14);
      doc.font('Helvetica').fontSize(12).fillColor('#c7d2fe').text(data.title || 'Report', 50, 38);

      let y = 80;
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Generated: ${new Date().toLocaleString()}`, 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      y += 14;

      // Summary stats
      if (data.stats) {
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e293b').text('Summary', 50, y);
        y += 18;
        Object.entries(data.stats).forEach(([k, v], i) => {
          const bx = 50 + (i % 2) * 248;
          const by = y + Math.floor(i / 2) * 46;
          doc.roundedRect(bx, by, 238, 38, 6).fillAndStroke('#f8fafc', '#e2e8f0');
          doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(k, bx + 10, by + 6);
          doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text(String(v), bx + 10, by + 16);
        });
        y += Math.ceil(Object.keys(data.stats).length / 2) * 46 + 16;
      }

      // Table
      if (data.rows?.length) {
        if (y > 650) { doc.addPage(); y = 50; }
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e293b').text('Details', 50, y);
        y += 18;
        const cols = Object.keys(data.rows[0]);
        const colW = Math.floor(495 / cols.length);
        doc.rect(50, y, 495, 20).fill('#6366F1');
        cols.forEach((c, ci) => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
            .text(c.toUpperCase(), 55 + ci * colW, y + 6, { width: colW - 4 });
        });
        y += 20;
        data.rows.forEach((row, ri) => {
          if (y > 730) { doc.addPage(); y = 50; }
          if (ri % 2 === 0) doc.rect(50, y, 495, 18).fill('#f8fafc');
          Object.values(row).forEach((val, ci) => {
            doc.font('Helvetica').fontSize(8).fillColor('#1e293b')
              .text(String(val || '—'), 55 + ci * colW, y + 5, { width: colW - 4, ellipsis: true });
          });
          y += 18;
        });
      }

      doc.end();
    } catch (err) { reject(err); }
  });
};

/**
 * Blue Dot Networks Email Service
 * - Reads SMTP config from DB (Admin → Profile → Mail Settings)
 * - Falls back to .env variables
 * - Templates: verify, reset, voucher, receipt, expiry, welcome, ticket
 */

const nodemailer = require('nodemailer');
const { logger }  = require('../utils/logger');

// ─── Build transporter fresh each send (picks up DB changes immediately) ─────
async function getTransporter() {
  let cfg = {};
  try {
    const { prisma } = require('../config/database');
    const rows = await prisma.setting.findMany({ where: { group: 'mail' } });
    cfg = rows.reduce((a, r) => { a[r.key] = r.value; return a; }, {});
  } catch { /* DB not ready yet — use env */ }

  const host   = cfg.smtp_host   || process.env.SMTP_HOST   || '';
  const port   = parseInt(cfg.smtp_port   || process.env.SMTP_PORT   || '587');
  const secure = (cfg.smtp_secure || process.env.SMTP_SECURE || 'false') === 'true';
  const user   = cfg.smtp_user   || process.env.SMTP_USER   || '';
  const pass   = cfg.smtp_pass   || process.env.SMTP_PASS   || '';
  const from   = cfg.email_from  || process.env.EMAIL_FROM  || `"Blue Dot Networks" <${user}>`;

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Go to Admin → My Profile → Mail Settings and fill in your SMTP details.');
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return { transporter, from };
}

// ─── Shared email wrapper ─────────────────────────────────────────────────────
const wrap = (title, accentColor = '#6366F1', body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${accentColor},#8B5CF6);padding:28px 32px;border-radius:14px 14px 0 0;text-align:center">
          <div style="font-size:28px;margin-bottom:6px">📡</div>
          <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.5px">Blue Dot Networks</div>
          <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:4px">${title}</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 14px 14px">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;text-align:center">
          <div style="color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} Blue Dot Networks · All rights reserved</div>
          <div style="color:#cbd5e1;font-size:11px;margin-top:4px">This is an automated message, please do not reply.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (url, text, color = '#6366F1') =>
  `<a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:18px 0">${text}</a>`;

const row = (label, value) =>
  `<tr><td style="padding:9px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap">${label}</td><td style="padding:9px 12px;font-weight:700;color:#1e293b;font-size:13px;border-bottom:1px solid #f1f5f9">${value}</td></tr>`;

const table = (rows) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;overflow:hidden;margin:16px 0">${rows}</table>`;

const alert = (text, color = '#6366F1') =>
  `<div style="background:${color}11;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;color:${color};font-size:13px;font-weight:600">${text}</div>`;

const p = (text, muted = false) =>
  `<p style="color:${muted ? '#64748b' : '#1e293b'};font-size:15px;line-height:1.7;margin:0 0 16px">${text}</p>`;

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
const TEMPLATES = {

  // ── Registration / Email Verification ──────────────────────────────────────
  verify: (d) => ({
    subject: '✉️ Verify your Blue Dot Networks account',
    html: wrap('Email Verification', '#6366F1', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p('Welcome to Blue Dot Networks! Please verify your email address to activate your account and start using our services.', true)}
      <div style="text-align:center">${btn(d.url, '✅ Verify My Email', '#6366F1')}</div>
      ${alert('⏱ This link expires in <strong>24 hours</strong>.')}
      ${p('If you did not create this account, you can safely ignore this email.', true)}
      ${p(`Or copy this link into your browser:<br><span style="font-family:monospace;font-size:12px;color:#6366F1;word-break:break-all">${d.url}</span>`, true)}
    `)
  }),

  // ── Password Reset ──────────────────────────────────────────────────────────
  reset: (d) => ({
    subject: '🔑 Reset your Blue Dot Networks password',
    html: wrap('Password Reset', '#EF4444', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p('We received a request to reset your password. Click the button below to choose a new one.', true)}
      <div style="text-align:center">${btn(d.url, '🔑 Reset My Password', '#EF4444')}</div>
      ${alert('⏱ This link expires in <strong>1 hour</strong>.', '#F59E0B')}
      ${p('If you did not request a password reset, please ignore this email. Your password will not be changed.', true)}
      ${p(`Or copy this link:<br><span style="font-family:monospace;font-size:12px;color:#EF4444;word-break:break-all">${d.url}</span>`, true)}
    `)
  }),

  // ── Welcome (after first login) ─────────────────────────────────────────────
  welcome: (d) => ({
    subject: `🎉 Welcome to Blue Dot Networks, ${d.name}!`,
    html: wrap('Welcome!', '#10B981', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p('Your Blue Dot Networks account is ready. Here\'s what you can do:', true)}
      <ul style="color:#64748b;font-size:14px;line-height:2;padding-left:20px">
        <li>🌐 Buy internet vouchers online with Paystack or Flutterwave</li>
        <li>📱 Scan QR codes to connect instantly</li>
        <li>📊 Track your data usage and session history</li>
        <li>🎫 Manage all your vouchers in one place</li>
      </ul>
      <div style="text-align:center">${btn(d.loginUrl || '#', '🚀 Go to My Account', '#10B981')}</div>
      ${p('If you have any questions, contact our support team anytime.', true)}
    `)
  }),

  // ── Payment Receipt ─────────────────────────────────────────────────────────
  receipt: (d) => ({
    subject: `🧾 Payment Receipt — ₦${Number(d.amount).toLocaleString()} — ${d.reference}`,
    html: wrap('Payment Receipt', '#10B981', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p('Thank you for your payment. Here is your official receipt:', true)}

      ${table(`
        ${row('Reference',   `<span style="font-family:monospace">${d.reference}</span>`)}
        ${row('Amount',      `<strong style="color:#10B981">₦${Number(d.amount).toLocaleString()}</strong>`)}
        ${row('Plan',        d.planName  || '—')}
        ${row('Gateway',     d.gateway   || '—')}
        ${row('Status',      '<span style="color:#10B981;font-weight:800">✅ PAID</span>')}
        ${row('Date',        new Date(d.paidAt || Date.now()).toLocaleString())}
        ${d.email ? row('Email', d.email) : ''}
      `)}

      ${alert('💾 Please save this email as your proof of payment.', '#10B981')}
      ${p('Your voucher code is included in a separate email. If you did not receive it, contact support.', true)}
    `)
  }),

  // ── Voucher Purchase Confirmation ───────────────────────────────────────────
  voucher: (d) => ({
    subject: `🎟️ Your Blue Dot Networks Voucher — ${d.voucher?.code}`,
    html: wrap('Your Voucher is Ready', '#6366F1', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p('Your payment was successful and your internet voucher is ready to use!', true)}

      <!-- Big voucher code display -->
      <div style="background:linear-gradient(135deg,#6366F111,#8B5CF611);border:2px dashed #6366F1;border-radius:14px;padding:28px;text-align:center;margin:20px 0">
        <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Your Voucher Code</div>
        <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:900;color:#6366F1;letter-spacing:8px">${d.voucher?.code}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:10px">Valid for ${d.plan?.validityLabel || 'your selected plan'}</div>
      </div>

      <!-- Plan details -->
      ${table(`
        ${row('Plan',         d.plan?.name          || '—')}
        ${row('Duration',     d.plan?.validityLabel  || '—')}
        ${row('Download',     d.plan?.downloadSpeed  ? `${d.plan.downloadSpeed} Mbps` : '—')}
        ${row('Upload',       d.plan?.uploadSpeed    ? `${d.plan.uploadSpeed} Mbps`   : '—')}
        ${row('Data',         d.plan?.unlimited ? 'Unlimited' : d.plan?.dataLimit ? `${d.plan.dataLimit} MB` : '—')}
        ${row('Activates',    'On first use')}
        ${row('Price',        `₦${Number(d.voucher?.price || 0).toLocaleString()}`)}
      `)}

      <!-- How to use -->
      <div style="background:#f8fafc;border-radius:10px;padding:18px;margin:16px 0">
        <div style="font-weight:800;font-size:14px;color:#1e293b;margin-bottom:10px">📶 How to Connect</div>
        <ol style="color:#64748b;font-size:13px;line-height:2;margin:0;padding-left:20px">
          <li>Connect to the <strong>Blue Dot Networks Wi-Fi</strong> network</li>
          <li>Open any website — you'll be redirected to the login page</li>
          <li>Enter your voucher code: <strong style="font-family:monospace;color:#6366F1">${d.voucher?.code}</strong></li>
          <li>Click <strong>Connect</strong> — you're online!</li>
        </ol>
      </div>

      ${alert('⚡ This voucher activates the moment you use it. The countdown starts from first use.', '#6366F1')}
      ${p('Keep this email safe — your voucher code is here anytime you need it.', true)}
    `)
  }),

  // ── Voucher Expiry Warning ──────────────────────────────────────────────────
  expiry: (d) => ({
    subject: `⚠️ Your voucher expires in ${d.hoursLeft} hour${d.hoursLeft !== 1 ? 's' : ''}`,
    html: wrap('Voucher Expiring Soon', '#F59E0B', `
      ${p(`Hello <strong>${d.name || 'Customer'}</strong>,`)}
      ${p(`Your voucher <strong style="font-family:monospace;color:#F59E0B">${d.code}</strong> is expiring soon.`, false)}

      ${table(`
        ${row('Voucher Code', `<span style="font-family:monospace">${d.code}</span>`)}
        ${row('Time Left',    `<strong style="color:#F59E0B">${d.hoursLeft} hour${d.hoursLeft !== 1 ? 's' : ''}</strong>`)}
        ${row('Expires At',   d.expiresAt ? new Date(d.expiresAt).toLocaleString() : '—')}
      `)}

      ${alert('🔄 Renew now before your session ends to avoid interruption!', '#F59E0B')}
      <div style="text-align:center">${btn((process.env.FRONTEND_URL || '') + '/buy', '🛒 Buy New Voucher', '#F59E0B')}</div>
    `)
  }),

  // ── Support Ticket Confirmation ─────────────────────────────────────────────
  ticketOpened: (d) => ({
    subject: `🎫 Support Ticket #${d.ticketNo} Opened`,
    html: wrap('Support Ticket Received', '#8B5CF6', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p('We have received your support request and will respond as soon as possible.', true)}

      ${table(`
        ${row('Ticket No.',  `<strong>#${d.ticketNo}</strong>`)}
        ${row('Subject',     d.subject  || '—')}
        ${row('Priority',    d.priority || 'Medium')}
        ${row('Status',      '<span style="color:#8B5CF6;font-weight:800">OPEN</span>')}
        ${row('Opened',      new Date().toLocaleString())}
      `)}

      ${p('We typically respond within a few hours. You will receive an email when we reply.', true)}
    `)
  }),

  // ── Support Ticket Reply ────────────────────────────────────────────────────
  ticketReply: (d) => ({
    subject: `💬 Reply on Ticket #${d.ticketNo}: ${d.subject}`,
    html: wrap('Ticket Update', '#8B5CF6', `
      ${p(`Hello <strong>${d.name}</strong>,`)}
      ${p(`Our team has replied to your ticket <strong>#${d.ticketNo}</strong>.`, true)}

      <div style="background:#f8fafc;border-radius:10px;padding:18px;margin:16px 0;border-left:4px solid #8B5CF6">
        <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:8px">Staff Reply</div>
        <div style="color:#1e293b;font-size:14px;line-height:1.7">${d.reply}</div>
      </div>

      ${p('Log in to your account to see the full conversation and reply.', true)}
    `)
  }),

};

// ─── MAIN SEND FUNCTION ───────────────────────────────────────────────────────
exports.sendEmail = async ({ to, subject, template, data, html }) => {
  const { transporter, from } = await getTransporter();
  const tmpl = template && TEMPLATES[template] ? TEMPLATES[template](data || {}) : { subject, html };

  const info = await transporter.sendMail({
    from,
    to,
    subject: tmpl.subject || subject,
    html:    tmpl.html    || html,
  });

  logger.info(`📧 Email sent → ${to}  [${template || 'custom'}]  id:${info.messageId}`);
  return info;
};

// ─── SEND SPECIFIC HELPERS ────────────────────────────────────────────────────

exports.sendVerificationEmail = (user, token) =>
  exports.sendEmail({
    to:       user.email,
    template: 'verify',
    data:     {
      name: user.firstName,
      url:  `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
    },
  });

exports.sendPasswordResetEmail = (user, token) =>
  exports.sendEmail({
    to:       user.email,
    template: 'reset',
    data:     {
      name: user.firstName,
      url:  `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    },
  });

exports.sendWelcomeEmail = (user) =>
  exports.sendEmail({
    to:       user.email,
    template: 'welcome',
    data:     {
      name:     user.firstName,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
    },
  });

exports.sendPaymentReceipt = (user, payment, planName) =>
  exports.sendEmail({
    to:       user.email,
    template: 'receipt',
    data:     {
      name:      `${user.firstName} ${user.lastName}`,
      email:     user.email,
      reference: payment.reference,
      amount:    payment.amount,
      planName,
      gateway:   payment.gateway,
      paidAt:    payment.paidAt,
    },
  });

exports.sendVoucherEmail = (email, name, voucher, plan) =>
  exports.sendEmail({
    to:       email,
    template: 'voucher',
    data:     { name, voucher, plan },
  });

exports.sendExpiryWarning = (email, name, voucher) =>
  exports.sendEmail({
    to:       email,
    template: 'expiry',
    data:     {
      name,
      code:      voucher.code,
      hoursLeft: Math.round((new Date(voucher.expiresAt) - new Date()) / 3600000),
      expiresAt: voucher.expiresAt,
    },
  });

exports.sendTicketConfirmation = (user, ticket) =>
  exports.sendEmail({
    to:       user.email,
    template: 'ticketOpened',
    data:     {
      name:     user.firstName,
      ticketNo: ticket.ticketNo,
      subject:  ticket.subject,
      priority: ticket.priority,
    },
  });

exports.sendTicketReply = (user, ticket, reply) =>
  exports.sendEmail({
    to:       user.email,
    template: 'ticketReply',
    data:     {
      name:     user.firstName,
      ticketNo: ticket.ticketNo,
      subject:  ticket.subject,
      reply,
    },
  });

/**
 * Auth Controller — Complete
 * Includes: register, login, verify, forgot/reset password,
 *           updateProfile, updateEmail, changePassword, sendTestEmail
 * All email sends are non-blocking (won't crash if SMTP not configured)
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { prisma }   = require('../config/database');
const { logger }   = require('../utils/logger');

const email = require('../services/email');

// ─── Token helper ─────────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user.id);
  const { password, ...userData } = user;
  res.status(statusCode).json({ success: true, token, data: { user: userData } });
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { email: userEmail, username, password, firstName, lastName, phone, role } = req.body;

    if (!userEmail || !username || !password || !firstName) {
      return res.status(400).json({ success: false, message: 'First name, email, username and password are required.' });
    }

    const exists = await prisma.user.findFirst({ where: { OR: [{ email: userEmail }, { username }] } });
    if (exists) return res.status(400).json({ success: false, message: 'Email or username already in use.' });

    // Only SUPER_ADMIN can assign admin roles
    let assignedRole = 'CUSTOMER';
    if (role && req.user?.role === 'SUPER_ADMIN') assignedRole = role;

    const hashed      = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { email: userEmail, username, password: hashed, firstName, lastName, phone, role: assignedRole, verifyToken },
    });

    // 📧 Send verification email (non-blocking)
    email.sendVerificationEmail(user, verifyToken).catch(e =>
      logger.warn('Verification email failed:', e.message)
    );

    await prisma.activityLog.create({ data: { userId: user.id, action: 'REGISTER', entity: 'User', ipAddress: req.ip } });
    sendTokenResponse(user, 201, res);
  } catch (error) { next(error); }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email: userEmail, password } = req.body;
    if (!userEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account suspended. Contact support.' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'LOGIN', entity: 'User', ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });

    sendTokenResponse(user, 200, res);
  } catch (error) { next(error); }
};

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });

    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true, verifyToken: null } });

    // 📧 Send welcome email after verification
    email.sendWelcomeEmail(user).catch(e => logger.warn('Welcome email failed:', e.message));

    res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (error) { next(error); }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email: userEmail } = req.body;

    // Always return same message to prevent email enumeration
    const ok = { success: true, message: 'If that email exists, a reset link has been sent.' };

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return res.json(ok);

    const resetToken    = crypto.randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExp } });

    // 📧 Send password reset email
    email.sendPasswordResetEmail(user, resetToken).catch(e =>
      logger.warn('Reset email failed:', e.message)
    );

    res.json(ok);
  } catch (error) { next(error); }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExp: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data:  { password: hashed, resetToken: null, resetTokenExp: null },
    });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) { next(error); }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user.id },
      include: { plan: true, notifications: { where: { isRead: false }, take: 5 } },
    });
    const { password, ...userData } = user;
    res.json({ success: true, data: { user: userData } });
  } catch (error) { next(error); }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) { next(error); }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    await prisma.activityLog.create({
      data: { userId: req.user?.id, action: 'LOGOUT', entity: 'User', ipAddress: req.ip },
    });
  } catch {}
  res.json({ success: true, message: 'Logged out.' });
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const user = await prisma.user.update({
      where:  { id: req.user.id },
      data:   { firstName, lastName, phone, address },
      select: { id: true, firstName: true, lastName: true, email: true, username: true, phone: true, address: true, role: true },
    });
    res.json({ success: true, message: 'Profile updated.', data: { user } });
  } catch (error) { next(error); }
};

// ─── UPDATE EMAIL ─────────────────────────────────────────────────────────────
exports.updateEmail = async (req, res, next) => {
  try {
    const { email: newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ success: false, message: 'New email and current password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const taken = await prisma.user.findFirst({ where: { email: newEmail, NOT: { id: req.user.id } } });
    if (taken) return res.status(400).json({ success: false, message: 'That email is already in use.' });

    // Generate new verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const updated = await prisma.user.update({
      where:  { id: req.user.id },
      data:   { email: newEmail, isVerified: false, verifyToken },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    // 📧 Send new verification email
    email.sendVerificationEmail({ ...updated, firstName: updated.firstName }, verifyToken)
      .catch(e => logger.warn('Email update verification failed:', e.message));

    res.json({ success: true, message: 'Email updated. A verification link has been sent to your new email address.', data: { user: updated } });
  } catch (error) { next(error); }
};

// ─── SEND TEST EMAIL ──────────────────────────────────────────────────────────
exports.sendTestEmail = async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Recipient email (to) is required.' });

    await email.sendEmail({
      to,
      subject: '✅ Blue Dot Networks — SMTP Test Successful',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:28px;border-radius:12px 12px 0 0;text-align:center">
            <div style="font-size:36px">📬</div>
            <h2 style="color:#fff;margin:8px 0 0">Test Email</h2>
          </div>
          <div style="background:#f8fafc;padding:28px;border-radius:0 0 12px 12px">
            <p style="color:#1e293b;font-size:16px">✅ <strong>Your SMTP configuration is working correctly!</strong></p>
            <p style="color:#64748b;font-size:14px">Emails will be sent from your Blue Dot Networks system for:</p>
            <ul style="color:#64748b;font-size:14px;line-height:2">
              <li>📧 Registration & email verification</li>
              <li>🔑 Password reset links</li>
              <li>🧾 Payment receipts</li>
              <li>🎟️ Voucher purchase confirmations</li>
              <li>⚠️ Voucher expiry warnings</li>
              <li>🎫 Support ticket updates</li>
            </ul>
            <p style="color:#94a3b8;font-size:12px;margin-top:20px">Sent at: ${new Date().toLocaleString()}</p>
          </div>
        </div>`,
    });

    res.json({ success: true, message: `✅ Test email sent to ${to}. Check your inbox (and spam folder).` });
  } catch (error) {
    // Return friendly error message instead of crashing
    res.status(500).json({
      success: false,
      message: `❌ SMTP Error: ${error.message}`,
      hint: 'Check your mail settings in Admin → My Profile → Mail/SMTP Settings',
    });
  }
};

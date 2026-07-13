/**
 * Auto Setup — runs on every server start
 * 1. Runs Prisma migrations
 * 2. Seeds default data if DB is empty
 * No shell access needed — works automatically on Render
 */

const { execSync } = require('child_process');
const { prisma }   = require('../config/database');
const { logger }   = require('./logger');
const bcrypt       = require('bcryptjs');
const path         = require('path');

async function autoSetup() {
  try {
    // ── Step 1: Run migrations automatically ─────────────────────────────
    logger.info('🔄 Running database migrations...');
    try {
      execSync('npx prisma migrate deploy', {
        cwd:   path.join(__dirname, '../../'),
        stdio: 'pipe',
        env:   { ...process.env },
      });
      logger.info('✅ Migrations applied');
    } catch (err) {
      const stdout = err.stdout?.toString() || '';
      const stderr = err.stderr?.toString() || '';
      const msg    = stdout + stderr + err.message;

      if (
        msg.includes('already') ||
        msg.includes('No pending') ||
        msg.includes('up to date') ||
        msg.includes('0 migrations')
      ) {
        logger.info('✅ Database already up to date');
      } else if (msg.includes('P3005') || msg.includes('baseline')) {
        // Database exists but has no migration history — safe to continue
        logger.warn('⚠️  Existing database detected — skipping baseline migration');
      } else {
        logger.warn('⚠️  Migration note:', msg.slice(0, 300));
      }
    }

    // ── Step 2: Check if already seeded ──────────────────────────────────
    const adminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    const planCount  = await prisma.internetPlan.count();

    if (adminCount > 0 && planCount > 0) {
      logger.info(`✅ Database already seeded (${adminCount} admin, ${planCount} plans) — skipping`);
      return;
    }

    logger.info('🌱 Seeding database for first time...');

    // ── Step 3: Create Super Admin ────────────────────────────────────────
    if (adminCount === 0) {
      const password = await bcrypt.hash('Admin@123', 12);
      await prisma.user.create({
        data: {
          email:       'admin@bluedotnetworks.com',
          username:    'admin',
          password,
          firstName:   'Super',
          lastName:    'Admin',
          role:        'SUPER_ADMIN',
          isActive:    true,
          isVerified:  true,
        },
      });
      logger.info('✅ Super Admin created  →  admin@bluedotnetworks.com / Admin@123');
    }

    // ── Step 4: Create default plans ─────────────────────────────────────
    if (planCount === 0) {
      const plans = [
        { name: '1 Hour',   price: 100,   downloadSpeed: 5,  uploadSpeed: 2,  dataLimit: 500,  unlimited: false, validity: 1,   validityLabel: '1 Hour',   priority: 8, description: 'Quick internet access',    sortOrder: 1 },
        { name: '3 Hours',  price: 250,   downloadSpeed: 8,  uploadSpeed: 3,  dataLimit: 1500, unlimited: false, validity: 3,   validityLabel: '3 Hours',  priority: 8, description: 'Extended session',         sortOrder: 2 },
        { name: '6 Hours',  price: 400,   downloadSpeed: 10, uploadSpeed: 5,  dataLimit: 3000, unlimited: false, validity: 6,   validityLabel: '6 Hours',  priority: 8, description: 'Half day plan',            sortOrder: 3 },
        { name: 'Daily',    price: 700,   downloadSpeed: 10, uploadSpeed: 5,  dataLimit: 5120, unlimited: false, validity: 24,  validityLabel: '24 Hours', priority: 8, description: 'Full day access',          sortOrder: 4 },
        { name: 'Weekly',   price: 3500,  downloadSpeed: 15, uploadSpeed: 8,  dataLimit: null, unlimited: true,  validity: 168, validityLabel: '7 Days',   priority: 8, description: 'Best value weekly plan',   sortOrder: 5 },
        { name: 'Monthly',  price: 10000, downloadSpeed: 20, uploadSpeed: 10, dataLimit: null, unlimited: true,  validity: 720, validityLabel: '30 Days',  priority: 8, description: 'Power user monthly plan', sortOrder: 6 },
      ];
      for (const p of plans) {
        await prisma.internetPlan.create({ data: p });
      }
      logger.info('✅ Default plans created');
    }

    // ── Step 5: Default settings ──────────────────────────────────────────
    const settingCount = await prisma.setting.count();
    if (settingCount === 0) {
      const settings = [
        { key: 'company_name',       value: 'Blue Dot Networks',                                            group: 'general'  },
        { key: 'company_tagline',    value: 'Stay Connected, Stay Ahead',                                  group: 'general'  },
        { key: 'company_email',      value: 'support@bluedotnetworks.com',                                          group: 'general'  },
        { key: 'company_phone',      value: '+234 800 123 4567',                                           group: 'general'  },
        { key: 'company_whatsapp',   value: '+234 800 123 4567',                                           group: 'general'  },
        { key: 'company_address',    value: 'Nigeria',                                                     group: 'general'  },
        { key: 'timezone',           value: 'Africa/Lagos',                                                group: 'general'  },
        { key: 'currency',           value: 'NGN',                                                         group: 'general'  },
        { key: 'currency_symbol',    value: '₦',                                                           group: 'general'  },
        { key: 'maintenance_mode',   value: 'false',                                                       group: 'general'  },
        { key: 'primary_color',      value: '#6366F1',                                                     group: 'branding' },
        { key: 'secondary_color',    value: '#8B5CF6',                                                     group: 'branding' },
        { key: 'accent_color',       value: '#EC4899',                                                     group: 'branding' },
        { key: 'logo_url',           value: '',                                                            group: 'branding' },
        { key: 'meta_title',         value: 'Blue Dot Networks — Fast & Reliable Wi-Fi',                     group: 'seo'      },
        { key: 'meta_description',   value: 'Affordable internet access with MikroTik-powered hotspot.',   group: 'seo'      },
        { key: 'paystack_enabled',   value: 'true',                                                        group: 'payment'  },
        { key: 'paystack_public_key',value: process.env.PAYSTACK_PUBLIC_KEY  || '',                        group: 'payment'  },
        { key: 'paystack_secret_key',value: process.env.PAYSTACK_SECRET_KEY  || '',                        group: 'payment'  },
        { key: 'paystack_test_mode', value: 'true',                                                        group: 'payment'  },
        { key: 'flutterwave_enabled',value: 'false',                                                       group: 'payment'  },
        { key: 'flutterwave_public_key', value: '',                                                        group: 'payment'  },
        { key: 'flutterwave_secret_key', value: '',                                                        group: 'payment'  },
        { key: 'default_gateway',    value: 'PAYSTACK',                                                    group: 'payment'  },
        { key: 'captive_welcome',    value: 'Welcome to Blue Dot Networks',                                  group: 'captive'  },
        { key: 'captive_subtitle',   value: 'Enter your voucher code or scan your QR card to connect.',   group: 'captive'  },
        { key: 'captive_footer',     value: `© ${new Date().getFullYear()} Blue Dot Networks`,              group: 'captive'  },
        // Mail — empty by default, admin fills in via Profile → SMTP Settings
        { key: 'smtp_host',   value: process.env.SMTP_HOST  || '', group: 'mail' },
        { key: 'smtp_port',   value: process.env.SMTP_PORT  || '587', group: 'mail' },
        { key: 'smtp_secure', value: process.env.SMTP_SECURE || 'false', group: 'mail' },
        { key: 'smtp_user',   value: process.env.SMTP_USER  || '', group: 'mail' },
        { key: 'smtp_pass',   value: process.env.SMTP_PASS  || '', group: 'mail' },
        { key: 'email_from',  value: process.env.EMAIL_FROM || '', group: 'mail' },
      ];
      for (const s of settings) {
        await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
      }
      logger.info('✅ Default settings created');
    }

    // ── Step 6: Legal pages ───────────────────────────────────────────────
    const legalCount = await prisma.legalPage.count();
    if (legalCount === 0) {
      const pages = [
        { slug: 'privacy-policy', title: 'Privacy Policy',     content: '<h2>Privacy Policy</h2><p>Blue Dot Networks respects your privacy and collects minimal data to provide internet access.</p>' },
        { slug: 'terms',          title: 'Terms & Conditions', content: '<h2>Terms & Conditions</h2><p>By using Blue Dot Networks, you agree to use the service lawfully and respect bandwidth limits.</p>' },
        { slug: 'refund-policy',  title: 'Refund Policy',      content: '<h2>Refund Policy</h2><p>Activated vouchers are non-refundable. Contact support for assistance.</p>' },
        { slug: 'about',          title: 'About Us',            content: '<h2>About Blue Dot Networks</h2><p>We provide affordable, reliable internet powered by MikroTik technology.</p>' },
        { slug: 'faq',            title: 'FAQ',                 content: '<h2>FAQ</h2><h3>How do I connect?</h3><p>Connect to Wi-Fi, open any page, enter your voucher code.</p>' },
        { slug: 'contact',        title: 'Contact Us',          content: '<h2>Contact</h2><p>Email: support@bluedotnetworks.com · Phone: +234 800 123 4567</p>' },
      ];
      for (const p of pages) {
        await prisma.legalPage.upsert({ where: { slug: p.slug }, update: {}, create: p });
      }
      logger.info('✅ Legal pages created');
    }

    // ── Step 7: Welcome announcement ──────────────────────────────────────
    const announceCount = await prisma.announcement.count();
    if (announceCount === 0) {
      await prisma.announcement.create({
        data: { title: '🎉 Welcome to Blue Dot Networks!', content: 'Enjoy fast and reliable internet access.', type: 'SUCCESS', isActive: true },
      });
      logger.info('✅ Welcome announcement created');
    }

    logger.info('🚀 Auto-setup complete! Admin: admin@bluedotnetworks.com / Admin@123');

  } catch (err) {
    logger.error('❌ Auto-setup error:', err.message);
    // Don't crash the server — log and continue
  }
}

module.exports = { autoSetup };

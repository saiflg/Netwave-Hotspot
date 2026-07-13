/**
 * Blue Dot Networks Database Seed
 * Run: node src/utils/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Super Admin ─────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bluedotnetworks.com' },
    update: {},
    create: {
      email: 'admin@bluedotnetworks.com',
      username: 'admin',
      password: adminPass,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      isVerified: true,
    }
  });
  console.log('✅ Super Admin:', admin.email);

  // ─── Default Plans (let Prisma auto-generate UUIDs) ──────────────────
  // Delete existing plans first to avoid conflicts
  const existingPlans = await prisma.internetPlan.findMany();
  console.log(`   Found ${existingPlans.length} existing plans`);

  const planDefs = [
    { name: '1 Hour',   price: 100,   downloadSpeed: 5,  uploadSpeed: 2,  dataLimit: 500,  unlimited: false, validity: 1,   validityLabel: '1 Hour',   priority: 8, description: 'Quick internet access',        sortOrder: 1 },
    { name: '3 Hours',  price: 250,   downloadSpeed: 8,  uploadSpeed: 3,  dataLimit: 1500, unlimited: false, validity: 3,   validityLabel: '3 Hours',  priority: 8, description: 'Extended browsing session',    sortOrder: 2 },
    { name: '6 Hours',  price: 400,   downloadSpeed: 10, uploadSpeed: 5,  dataLimit: 3000, unlimited: false, validity: 6,   validityLabel: '6 Hours',  priority: 8, description: 'Half day plan',               sortOrder: 3 },
    { name: 'Daily',    price: 700,   downloadSpeed: 10, uploadSpeed: 5,  dataLimit: 5120, unlimited: false, validity: 24,  validityLabel: '24 Hours', priority: 8, description: 'Full day access',             sortOrder: 4 },
    { name: 'Weekly',   price: 3500,  downloadSpeed: 15, uploadSpeed: 8,  dataLimit: null, unlimited: true,  validity: 168, validityLabel: '7 Days',   priority: 8, description: 'Best value weekly plan',      sortOrder: 5 },
    { name: 'Monthly',  price: 10000, downloadSpeed: 20, uploadSpeed: 10, dataLimit: null, unlimited: true,  validity: 720, validityLabel: '30 Days',  priority: 8, description: 'Power user monthly plan',     sortOrder: 6 },
  ];

  const createdPlans = [];
  for (const p of planDefs) {
    // Check by name
    let plan = await prisma.internetPlan.findFirst({ where: { name: p.name } });
    if (plan) {
      plan = await prisma.internetPlan.update({ where: { id: plan.id }, data: p });
      console.log(`   Updated plan: ${plan.name} (${plan.id})`);
    } else {
      plan = await prisma.internetPlan.create({ data: p });
      console.log(`   Created plan: ${plan.name} (${plan.id})`);
    }
    createdPlans.push(plan);
  }
  console.log('✅ Plans seeded');

  // ─── Default Settings ─────────────────────────────────────────────────
  const settings = [
    { key: 'company_name',       value: 'Blue Dot Networks',                                                                      group: 'general'  },
    { key: 'company_tagline',    value: 'Stay Connected, Stay Ahead',                                                           group: 'general'  },
    { key: 'company_email',      value: 'support@bluedotnetworks.com',                                                                   group: 'general'  },
    { key: 'company_phone',      value: '+234 800 123 4567',                                                                    group: 'general'  },
    { key: 'company_whatsapp',   value: '+234 800 123 4567',                                                                    group: 'general'  },
    { key: 'company_address',    value: '12 Tech Hub, Abuja, Nigeria',                                                          group: 'general'  },
    { key: 'company_website',    value: 'https://bluedotnetworks.com',                                                                   group: 'general'  },
    { key: 'timezone',           value: 'Africa/Lagos',                                                                         group: 'general'  },
    { key: 'country',            value: 'Nigeria',                                                                              group: 'general'  },
    { key: 'currency',           value: 'NGN',                                                                                  group: 'general'  },
    { key: 'currency_symbol',    value: '₦',                                                                                    group: 'general'  },
    { key: 'language',           value: 'en',                                                                                   group: 'general'  },
    { key: 'maintenance_mode',   value: 'false',                                                                                group: 'general'  },
    { key: 'primary_color',      value: '#6366F1',                                                                              group: 'branding' },
    { key: 'secondary_color',    value: '#8B5CF6',                                                                              group: 'branding' },
    { key: 'accent_color',       value: '#EC4899',                                                                              group: 'branding' },
    { key: 'logo_url',           value: '',                                                                                     group: 'branding' },
    { key: 'favicon_url',        value: '',                                                                                     group: 'branding' },
    { key: 'login_bg_url',       value: '',                                                                                     group: 'branding' },
    { key: 'meta_title',         value: 'Blue Dot Networks — Fast & Reliable Wi-Fi',                                              group: 'seo'      },
    { key: 'meta_description',   value: 'Affordable internet access plans with MikroTik-powered hotspot.',                      group: 'seo'      },
    { key: 'meta_keywords',      value: 'hotspot, wifi, voucher, internet, Nigeria',                                            group: 'seo'      },
    { key: 'paystack_enabled',   value: 'true',                                                                                 group: 'payment'  },
    { key: 'paystack_public_key',value: process.env.PAYSTACK_PUBLIC_KEY || '',                                                  group: 'payment'  },
    { key: 'paystack_secret_key',value: process.env.PAYSTACK_SECRET_KEY || '',                                                  group: 'payment'  },
    { key: 'paystack_test_mode', value: 'true',                                                                                 group: 'payment'  },
    { key: 'flutterwave_enabled',value: 'false',                                                                                group: 'payment'  },
    { key: 'flutterwave_public_key', value: '',                                                                                 group: 'payment'  },
    { key: 'flutterwave_secret_key', value: '',                                                                                 group: 'payment'  },
    { key: 'default_gateway',    value: 'PAYSTACK',                                                                             group: 'payment'  },
    { key: 'captive_welcome',    value: 'Welcome to Blue Dot Networks',                                                           group: 'captive'  },
    { key: 'captive_subtitle',   value: 'Connect to fast internet instantly. Enter your voucher code to get started.',          group: 'captive'  },
    { key: 'captive_footer',     value: '© 2025 Blue Dot Networks. All rights reserved.',                                        group: 'captive'  },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where:  { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ Settings seeded');

  // ─── Legal Pages ──────────────────────────────────────────────────────
  const pages = [
    { slug: 'privacy-policy', title: 'Privacy Policy',    content: '<h2>Privacy Policy</h2><p>Blue Dot Networks respects your privacy. We collect minimal data required to provide internet access services.</p><h3>Data We Collect</h3><ul><li>Email address and contact information</li><li>Device MAC address for authentication</li><li>Session duration and data usage</li></ul>' },
    { slug: 'terms',          title: 'Terms & Conditions',content: '<h2>Terms & Conditions</h2><p>By using Blue Dot Networks services, you agree to these terms.</p><h3>Acceptable Use</h3><ul><li>Do not use the service for illegal activities</li><li>Respect bandwidth limits of your purchased plan</li></ul>' },
    { slug: 'refund-policy',  title: 'Refund Policy',     content: '<h2>Refund Policy</h2><p>Vouchers that have been activated cannot be refunded. Contact support for assistance.</p>' },
    { slug: 'about',          title: 'About Us',           content: '<h2>About Blue Dot Networks</h2><p>Blue Dot Networks provides affordable, reliable internet access powered by MikroTik technology.</p>' },
    { slug: 'faq',            title: 'FAQ',                content: '<h2>Frequently Asked Questions</h2><h3>How do I connect?</h3><p>Connect to our Wi-Fi, open any website, and you will be redirected to our login page.</p><h3>How do I pay?</h3><p>Select a plan and pay securely via Paystack or Flutterwave.</p>' },
    { slug: 'contact',        title: 'Contact Us',         content: '<h2>Contact Us</h2><p>Email: support@bluedotnetworks.com<br>Phone: +234 800 123 4567</p>' },
  ];

  for (const p of pages) {
    await prisma.legalPage.upsert({
      where:  { slug: p.slug },
      update: p,
      create: p,
    });
  }
  console.log('✅ Legal pages seeded');

  // ─── Sample Announcement ──────────────────────────────────────────────
  const existingAnnounce = await prisma.announcement.findFirst({ where: { title: '🎉 Welcome to Blue Dot Networks!' } });
  if (!existingAnnounce) {
    await prisma.announcement.create({
      data: { title: '🎉 Welcome to Blue Dot Networks!', content: 'We are happy to serve you. Enjoy fast and reliable internet access.', type: 'SUCCESS', isActive: true }
    });
  }
  console.log('✅ Announcement seeded');

  // ─── Print summary ────────────────────────────────────────────────────
  console.log('\n✅ Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Admin email    : admin@bluedotnetworks.com');
  console.log('🔑 Admin password : Admin@123');
  console.log('📋 Plans created  :', createdPlans.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nPlan IDs (use these when creating vouchers via API):');
  createdPlans.forEach(p => console.log(`   ${p.name.padEnd(10)} → ${p.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());

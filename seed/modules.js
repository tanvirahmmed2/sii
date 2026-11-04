const { pool, query } = require('./db');

// 1. Platform Modules for Developer Panel (schema.psql -> modules)
const PLATFORM_MODULES = [
  { name: 'Developer Overview', slug: 'overview', description: 'Platform analytics, KPIs, tenant metrics, and developer overview' },
  { name: 'Developers Team', slug: 'developers', description: 'Developer user accounts, authentication profiles, and team management' },
  { name: 'Roles & Permissions', slug: 'roles', description: 'Developer access levels, module authorization, and role configuration' },
  { name: 'Engineering Team', slug: 'team', description: 'Internal platform engineering staff, contributors, and designations' },
  { name: 'Creators & Tenants', slug: 'creators', description: 'School owners, institutional customers, and multi-tenant profiles' },
  { name: 'Platform Users', slug: 'users', description: 'Global registered users, auth sessions, and user management' },
  { name: 'Multi-Tenant Websites', slug: 'websites', description: 'Institutional portals, custom domains (*.edu.bd), and tenant subdomains' },
  { name: 'Blog & Articles', slug: 'blogs', description: 'Marketing articles, news publications, and platform educational blog' },
  { name: 'Platform Themes', slug: 'themes', description: 'Visual themes, color systems, and modern SaaS layout presets' },
  { name: 'Subscription Packages', slug: 'packages', description: 'Platform billing plans, pricing tiers, and feature package limits' },
  { name: 'Platform Features', slug: 'features', description: 'Granular feature toggles, quota specifications, and platform capabilities' },
  { name: 'Database Modules', slug: 'modules', description: 'PostgreSQL catalog introspection, live data schema, and table management' },
  { name: 'Purchases & Orders', slug: 'purchases', description: 'Customer software licenses, package purchase logs, and invoice orders' },
  { name: 'Payments Ledger', slug: 'payments', description: 'Platform financial transactions, payment gateway settlements, and billing history' },
  { name: 'Tenant Subscriptions', slug: 'subscriptions', description: 'Active institutional recurring plans, renewals, and subscription cycles' },
  { name: 'Staff Payroll', slug: 'payroll', description: 'Employee salary definitions, payroll generations, and payment disbursement' },
  { name: 'My Developer Salaries', slug: 'my-salaries', description: 'Individual developer pay-stubs, salary vouchers, and compensation history' },
  { name: 'Live Chat Support', slug: 'live-chats', description: 'Real-time WebSocket visitor chats, agent queues, and customer live support' },
  { name: 'Internal Team Chats', slug: 'chats', description: 'Platform internal developer messaging, channels, and direct chats' },
  { name: 'Contact Inquiries', slug: 'contacts', description: 'Platform inbound contact messages, lead inquiries, and customer replies' },
  { name: 'Support Help Desk', slug: 'support', description: 'Technical support tickets, developer triage, attachments, and resolution tracking' },
  { name: 'Projects & Boards', slug: 'projects', description: 'Developer project management, sprint backlogs, and milestone tracking' },
  { name: 'System Reports', slug: 'reports', description: 'Platform health monitoring, operational alerts, and audit analytics' },
  { name: 'Customer Reviews', slug: 'reviews', description: 'Tenant testimonials, software ratings, and platform public feedback' },
  { name: 'Spam Defense', slug: 'spams', description: 'IP rate-limiting, disposable email blockers, bot protection, and security filters' },
  { name: 'Sales Leads', slug: 'leads', description: 'Prospective institutional leads, CRM stages, and demo conversion tracking' },
  { name: 'Newsletter Subscribers', slug: 'subscribers', description: 'Email newsletter audience, campaign subscriptions, and subscriber lists' },
  { name: 'Platform Apps', slug: 'apps', description: 'Third-party integrations, OAuth providers, and ecosystem developer apps' },
  { name: 'Developer Profile', slug: 'profile', description: 'Personal developer profile, security preferences, and credential management' },
  { name: 'System Settings', slug: 'settings', description: 'Global SaaS branding, environment variables, and master configuration' },
  { name: 'Platform FAQs', slug: 'faqs', description: 'Frequently asked questions, knowledge base entries, and customer help docs' },
  { name: 'Product Updates', slug: 'updates', description: 'Changelog entries, platform version announcements, and release notes' },
  { name: 'Sprint Tasks', slug: 'tasks', description: 'Engineering agile task tracker, todo items, deadlines, and task comments' },
  { name: 'Company Notices', slug: 'notices', description: 'Internal corporate broadcasts, memos, and developer announcements' },
  { name: 'Academy Tutorials', slug: 'tutorials', description: 'Video guides, system documentation, and interactive walk-throughs' },
  { name: 'Careers & Hiring', slug: 'careers', description: 'Job openings, candidate job applications, and recruitment pipelines' },
  { name: 'Company Policies', slug: 'policies', description: 'Terms of service, privacy policies, refund terms, and legal compliance' },
  { name: 'Facebook Messages', slug: 'facebook-messages', description: 'Meta Graph API Facebook page messaging and automated webhook inbound' },
  { name: 'Instagram Messages', slug: 'instagram-messages', description: 'Meta Instagram direct messaging sync and customer conversation threads' },
  { name: 'Document Templates', slug: 'templates', description: 'Visual designer templates, student ID cards, certificates, and TC templates' },
  { name: 'WhatsApp Messages', slug: 'whatsapp-messages', description: 'WhatsApp Business API cloud conversations, message templates, and alerts' },
];

// 2. Canonical Tenant System Modules (website_tables.psql -> website_modules)
const TENANT_SYSTEM_MODULES = [
  {
    name: 'Student Information System (SIS)',
    slug: 'sis',
    description: 'Complete student profiles, enrollment, academic history, student records, and student ID management',
    icon: 'BiUser',
  },
  {
    name: 'Attendance Tracker',
    slug: 'attendance',
    description: 'Daily automated student & staff attendance with biometric support, leave management, and SMS alerts',
    icon: 'BiCalendarCheck',
  },
  {
    name: 'Examinations & Report Cards',
    slug: 'exams',
    description: 'Exam scheduling, question banks, admit cards, marks processing, and automated report cards',
    icon: 'BiAward',
  },
  {
    name: 'LMS & Study Materials',
    slug: 'lms',
    description: 'Digital classrooms, syllabus, lecture notes, homework assignments, and online video classes',
    icon: 'BiBookOpen',
  },
  {
    name: 'Fees & Online Collections',
    slug: 'fees',
    description: 'Tuition and term fee vouchers, collection receipts, bKash/Nagad/Card gateway integration',
    icon: 'BiCreditCard',
  },
  {
    name: 'Accounting & Financial Ledger',
    slug: 'accounting',
    description: 'Institutional accounting, income/expense tracking, purchase orders, vendor ledger, and balance sheets',
    icon: 'BiLineChart',
  },
  {
    name: 'Staff & Payroll Management',
    slug: 'staff-payroll',
    description: 'Teacher/employee profiles, designation scales, leave requests, monthly payroll, and salary disbursement',
    icon: 'BiGroup',
  },
  {
    name: 'Routine & Class Scheduling',
    slug: 'routine',
    description: 'Departments, classes, sections, subjects, dynamic weekly timetable generator, and teacher periods',
    icon: 'BiTime',
  },
  {
    name: 'Notice & Broadcast System',
    slug: 'notices',
    description: 'School broadcast notices, circulars, digital bulletin boards, and instant SMS/Email announcements',
    icon: 'BiBell',
  },
  {
    name: 'Hostel & Dormitory',
    slug: 'hostel',
    description: 'Hostel halls, room inventories, bed seat allocations, residency fees, and hostel warden logs',
    icon: 'BiBuilding',
  },
  {
    name: 'Transport & Fleet Tracking',
    slug: 'transport',
    description: 'Vehicle fleet management, driver contacts, pickup routes, stops, and student transport fees',
    icon: 'BiBus',
  },
  {
    name: 'Public Institutional Website',
    slug: 'website-builder',
    description: 'Dynamic frontend school portal, landing page, about, achievements, vision, and photo galleries',
    icon: 'BiDesktop',
  },
  {
    name: 'Library & Circulation Management',
    slug: 'library',
    description: 'Library book catalog, writer/publisher indexes, bookshelf allocations, and circulation issue/return',
    icon: 'BiBookBookmark',
  },
  {
    name: 'Administration & Officers',
    slug: 'officers',
    description: 'Administrative officers, designation hierarchies, duty workstations, and granular officer permissions',
    icon: 'BiShieldQuarter',
  },
  {
    name: 'Admissions & Online Enrollment',
    slug: 'admissions',
    description: 'Public admission circulars, applicant portal, entrance examination marks, merit lists, and student onboarding',
    icon: 'BiUserPlus',
  },
  {
    name: 'Campus Clubs & Organizations',
    slug: 'clubs',
    description: 'Student extracurricular clubs, member rosters, moderators, club notices, events, and campus news feeds',
    icon: 'BiCompass',
  },
  {
    name: 'Events & Campus Activities',
    slug: 'events',
    description: 'Campus events calendar, applicant registrations, event schedules, and student participation tracking',
    icon: 'BiCalendarEvent',
  },
  {
    name: 'Certificates & Document Templates',
    slug: 'documents',
    description: 'Academic document generation, Student & Teacher ID cards, Transfer Certificates (TC), testimonials, and visual templates',
    icon: 'BiFile',
  },
  {
    name: 'Multi-Channel Communications & Meta',
    slug: 'communications',
    description: 'Brevo email mailer, SMS broadcast gateways, Facebook, Instagram, and WhatsApp customer messaging',
    icon: 'BiMessageRoundedDots',
  },
  {
    name: 'Institutional Settings & Payment Gateways',
    slug: 'settings',
    description: 'Campus branding, payment gateway routing (bKash, Nagad, Cards), general system configuration, and security preferences',
    icon: 'BiCog',
  },
];

async function seedModules() {
  console.log('\n======================================================');
  console.log('2. SEEDING PLATFORM MODULES & WEBSITE MODULES');
  console.log('======================================================');

  // 1. Seed Platform Developer Modules
  console.log(`-> Seeding ${PLATFORM_MODULES.length} platform developer modules into "modules"...`);
  let platformCount = 0;
  for (const mod of PLATFORM_MODULES) {
    await query(
      `INSERT INTO modules (name, slug, description, is_active, updated_at)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [mod.name, mod.slug, mod.description]
    );
    platformCount++;
  }
  console.log(`✓ Inserted/updated ${platformCount} platform modules in "modules".`);

  // 2. Seed Tenant System Modules
  console.log(`-> Seeding ${TENANT_SYSTEM_MODULES.length} canonical modules into "website_modules"...`);
  let tenantCount = 0;
  for (const mod of TENANT_SYSTEM_MODULES) {
    await query(
      `INSERT INTO website_modules (name, slug, description, icon, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [mod.name, mod.slug, mod.description, mod.icon]
    );
    tenantCount++;
  }
  console.log(`✓ Inserted/updated ${tenantCount} canonical modules in "website_modules".`);

  return {
    success: true,
    platform_modules_seeded: platformCount,
    website_modules_seeded: tenantCount,
  };
}

if (require.main === module) {
  seedModules()
    .then((res) => {
      console.log('\nAll modules successfully seeded!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error seeding modules:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  seedModules,
  PLATFORM_MODULES,
  TENANT_SYSTEM_MODULES,
};


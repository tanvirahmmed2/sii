const { pool, query } = require('./db');

// Platform Developer Modules (schema.psql -> modules)
// Records each developer panel page route and its corresponding API endpoint
const PLATFORM_MODULES = [
  { name: 'Developer Overview', slug: 'overview', page_path: '/developer/overview', api_path: '/api/marketing/developer', icon: 'BiGridAlt', description: 'Platform analytics, KPIs, tenant metrics, and developer overview' },
  { name: 'Developers Team', slug: 'developers', page_path: '/developer/developers', api_path: '/api/marketing/developer/devs', icon: 'BiUser', description: 'Developer user accounts, authentication profiles, and team management' },
  { name: 'Roles & Permissions', slug: 'roles', page_path: '/developer/roles', api_path: '/api/marketing/developer/permissions', icon: 'BiShieldQuarter', description: 'Developer access levels, module authorization, and role configuration' },
  { name: 'Engineering Team', slug: 'team', page_path: '/developer/team', api_path: '/api/marketing/developer/devs', icon: 'BiGroup', description: 'Internal platform engineering staff, contributors, and designations' },
  { name: 'Creators & Tenants', slug: 'creators', page_path: '/developer/creators', api_path: '/api/marketing/developer/creators', icon: 'BiBuilding', description: 'School owners, institutional customers, and multi-tenant profiles' },
  { name: 'Platform Users', slug: 'users', page_path: '/developer/users', api_path: '/api/marketing/developer/users', icon: 'BiUserCheck', description: 'Global registered users, auth sessions, and user management' },
  { name: 'Multi-Tenant Websites', slug: 'websites', page_path: '/developer/websites', api_path: '/api/marketing/developer/websites', icon: 'BiGlobe', description: 'Institutional portals, custom domains (*.edu.bd), and tenant subdomains' },
  { name: 'Blog & Articles', slug: 'blogs', page_path: '/developer/blogs', api_path: '/api/marketing/developer/blogs', icon: 'BiBookOpen', description: 'Marketing articles, news publications, and platform educational blog' },
  { name: 'Platform Themes', slug: 'themes', page_path: '/developer/themes', api_path: '/api/marketing/developer/templates', icon: 'BiPalette', description: 'Visual themes, color systems, and modern SaaS layout presets' },
  { name: 'Subscription Packages', slug: 'packages', page_path: '/developer/packages', api_path: '/api/marketing/developer/packages', icon: 'BiPackage', description: 'Platform billing plans, pricing tiers, and feature package limits' },
  { name: 'Platform Features', slug: 'features', page_path: '/developer/features', api_path: '/api/marketing/developer/features', icon: 'BiLayer', description: 'Granular feature toggles, quota specifications, and platform capabilities' },
  { name: 'Database Modules', slug: 'modules', page_path: '/developer/modules', api_path: '/api/marketing/developer/modules', icon: 'BiData', description: 'PostgreSQL catalog introspection, live data schema, and table management' },
  { name: 'Purchases & Orders', slug: 'purchases', page_path: '/developer/purchases', api_path: '/api/marketing/developer/purchases', icon: 'BiCart', description: 'Customer software licenses, package purchase logs, and invoice orders' },
  { name: 'Payments Ledger', slug: 'payments', page_path: '/developer/payments', api_path: '/api/marketing/developer/payments', icon: 'BiCreditCard', description: 'Platform financial transactions, payment gateway settlements, and billing history' },
  { name: 'Tenant Subscriptions', slug: 'subscriptions', page_path: '/developer/subscriptions', api_path: '/api/marketing/developer/subscriptions', icon: 'BiRefresh', description: 'Active institutional recurring plans, renewals, and subscription cycles' },
  { name: 'Staff Payroll', slug: 'payroll', page_path: '/developer/payroll', api_path: '/api/marketing/developer/payroll', icon: 'BiMoney', description: 'Employee salary definitions, payroll generations, and payment disbursement' },
  { name: 'My Developer Salaries', slug: 'my-salaries', page_path: '/developer/my-salaries', api_path: '/api/marketing/developer/my-salaries', icon: 'BiWallet', description: 'Individual developer pay-stubs, salary vouchers, and compensation history' },
  { name: 'Live Chat Support', slug: 'live-chats', page_path: '/developer/live-chats', api_path: '/api/marketing/developer/live-chats', icon: 'BiMessage', description: 'Real-time WebSocket visitor chats, agent queues, and customer live support' },
  { name: 'Internal Team Chats', slug: 'chats', page_path: '/developer/chats', api_path: '/api/marketing/developer/chats', icon: 'BiChat', description: 'Platform internal developer messaging, channels, and direct chats' },
  { name: 'Contact Inquiries', slug: 'contacts', page_path: '/developer/contacts', api_path: '/api/marketing/developer/contacts', icon: 'BiEnvelope', description: 'Platform inbound contact messages, lead inquiries, and customer replies' },
  { name: 'Support Help Desk', slug: 'support', page_path: '/developer/support', api_path: '/api/marketing/developer/support', icon: 'BiSupport', description: 'Technical support tickets, developer triage, attachments, and resolution tracking' },
  { name: 'Projects & Boards', slug: 'projects', page_path: '/developer/projects', api_path: '/api/marketing/developer/tasks', icon: 'BiTrello', description: 'Developer project management, sprint backlogs, and milestone tracking' },
  { name: 'System Reports', slug: 'reports', page_path: '/developer/reports', api_path: '/api/marketing/developer/reports', icon: 'BiBarChart', description: 'Platform health monitoring, operational alerts, and audit analytics' },
  { name: 'Customer Reviews', slug: 'reviews', page_path: '/developer/reviews', api_path: '/api/marketing/developer/reviews', icon: 'BiStar', description: 'Tenant testimonials, software ratings, and platform public feedback' },
  { name: 'Spam Defense', slug: 'spams', page_path: '/developer/spams', api_path: '/api/marketing/developer/spams', icon: 'BiShieldX', description: 'IP rate-limiting, disposable email blockers, bot protection, and security filters' },
  { name: 'Sales Leads', slug: 'leads', page_path: '/developer/leads', api_path: '/api/marketing/developer/leads', icon: 'BiTargetLock', description: 'Prospective institutional leads, CRM stages, and demo conversion tracking' },
  { name: 'Newsletter Subscribers', slug: 'subscribers', page_path: '/developer/subscribers', api_path: '/api/marketing/developer/subscribers', icon: 'BiMailSend', description: 'Email newsletter audience, campaign subscriptions, and subscriber lists' },
  { name: 'Platform Apps', slug: 'apps', page_path: '/developer/apps', api_path: '/api/marketing/developer/settings', icon: 'BiCategory', description: 'Third-party integrations, OAuth providers, and ecosystem developer apps' },
  { name: 'Developer Profile', slug: 'profile', page_path: '/developer/profile', api_path: '/api/marketing/developer/profile', icon: 'BiIdCard', description: 'Personal developer profile, security preferences, and credential management' },
  { name: 'System Settings', slug: 'settings', page_path: '/developer/settings', api_path: '/api/marketing/developer/settings', icon: 'BiCog', description: 'Global SaaS branding, environment variables, and master configuration' },
  { name: 'Platform FAQs', slug: 'faqs', page_path: '/developer/faqs', api_path: '/api/marketing/developer/faqs', icon: 'BiHelpCircle', description: 'Frequently asked questions, knowledge base entries, and customer help docs' },
  { name: 'Product Updates', slug: 'updates', page_path: '/developer/updates', api_path: '/api/marketing/developer/updates', icon: 'BiBell', description: 'Changelog entries, platform version announcements, and release notes' },
  { name: 'Sprint Tasks', slug: 'tasks', page_path: '/developer/tasks', api_path: '/api/marketing/developer/tasks', icon: 'BiCheckSquare', description: 'Engineering agile task tracker, todo items, deadlines, and task comments' },
  { name: 'Company Notices', slug: 'notices', page_path: '/developer/notices', api_path: '/api/marketing/developer/notices', icon: 'BiBroadcast', description: 'Internal corporate broadcasts, memos, and developer announcements' },
  { name: 'Academy Tutorials', slug: 'tutorials', page_path: '/developer/tutorials', api_path: '/api/marketing/developer/tutorials', icon: 'BiVideo', description: 'Video guides, system documentation, and interactive walk-throughs' },
  { name: 'Careers & Hiring', slug: 'careers', page_path: '/developer/careers', api_path: '/api/marketing/developer/careers', icon: 'BiBriefcase', description: 'Job openings, candidate job applications, and recruitment pipelines' },
  { name: 'Company Policies', slug: 'policies', page_path: '/developer/policies', api_path: '/api/marketing/developer/policies', icon: 'BiFileText', description: 'Terms of service, privacy policies, refund terms, and legal compliance' },
  { name: 'Facebook Messages', slug: 'facebook-messages', page_path: '/developer/facebook-messages', api_path: '/api/marketing/developer/meta/messages', icon: 'BiLogoFacebook', description: 'Meta Graph API Facebook page messaging and automated webhook inbound' },
  { name: 'Instagram Messages', slug: 'instagram-messages', page_path: '/developer/instagram-messages', api_path: '/api/marketing/developer/meta/messages', icon: 'BiLogoInstagram', description: 'Meta Instagram direct messaging sync and customer conversation threads' },
  { name: 'Document Templates', slug: 'templates', page_path: '/developer/templates', api_path: '/api/marketing/developer/templates', icon: 'BiFile', description: 'Visual designer templates, student ID cards, certificates, and TC templates' },
  { name: 'WhatsApp Messages', slug: 'whatsapp-messages', page_path: '/developer/whatsapp-messages', api_path: '/api/marketing/developer/meta/messages', icon: 'BiLogoWhatsapp', description: 'WhatsApp Business API cloud conversations, message templates, and alerts' },
];

async function seedModules() {
  console.log('\n======================================================');
  console.log('2. SEEDING PLATFORM DEVELOPER MODULES');
  console.log('======================================================');

  console.log(`-> Seeding ${PLATFORM_MODULES.length} platform developer modules into "modules"...`);
  let platformCount = 0;
  for (let i = 0; i < PLATFORM_MODULES.length; i++) {
    const mod = PLATFORM_MODULES[i];
    await query(
      `INSERT INTO modules (name, slug, page_path, api_path, icon, description, sort_order, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         page_path = EXCLUDED.page_path,
         api_path = EXCLUDED.api_path,
         icon = EXCLUDED.icon,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [mod.name, mod.slug, mod.page_path, mod.api_path, mod.icon, mod.description, i + 1]
    );
    platformCount++;
  }
  console.log(`✓ Inserted/updated ${platformCount} platform modules in "modules".`);

  return {
    success: true,
    platform_modules_seeded: platformCount,
  };
}

if (require.main === module) {
  seedModules()
    .then((res) => {
      console.log('\nPlatform modules successfully seeded!', res);
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
};

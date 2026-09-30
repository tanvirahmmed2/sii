import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

const modulesData = [
  { name: 'Overview Dashboard', slug: 'overview', description: 'Platform statistics and system metrics' },
  { name: 'Developer Accounts', slug: 'developers', description: 'Manage developer engineers and staff accounts' },
  { name: 'Roles & Permissions', slug: 'roles', description: 'Configure granular RBAC permissions and security roles' },
  { name: 'Team Management', slug: 'team', description: 'Internal team organization and department structures' },
  { name: 'Creators / Clients', slug: 'creators', description: 'School owners, client profiles and institutional accounts' },
  { name: 'Platform Users', slug: 'users', description: 'End-users, students, teachers and staff directories' },
  { name: 'Tenant Websites', slug: 'websites', description: 'Deployed client websites, subdomains and custom domains' },
  { name: 'Articles & Blogs', slug: 'blogs', description: 'Platform news, release posts and technical blog articles' },
  { name: 'Themes Catalog', slug: 'themes', description: 'Educational website visual templates and layout presets' },
  { name: 'Subscription Packages', slug: 'packages', description: 'Tiered subscription pricing plans and tier limits' },
  { name: 'Feature Flags', slug: 'features', description: 'Global platform capabilities and feature toggles' },
  { name: 'System Modules', slug: 'modules', description: 'Tenant modules catalog and module activation' },
  { name: 'Client Purchases', slug: 'purchases', description: 'Theme licenses, module addons and custom orders' },
  { name: 'Billing & Payments', slug: 'payments', description: 'Gateway transactions, invoices, bkash and bank records' },
  { name: 'Active Subscriptions', slug: 'subscriptions', description: 'Recurring client subscription renewals and billing cycles' },
  { name: 'Staff Payroll', slug: 'payroll', description: 'Employee compensation, salary disbursements and payroll records' },
  { name: 'My Salaries', slug: 'my-salaries', description: 'Personal developer compensation slips and disbursement logs' },
  { name: 'Live Chat Support', slug: 'live-chats', description: 'Real-time client messaging and visitor live assistance' },
  { name: 'Internal Chats', slug: 'chats', description: 'Direct messages and team channels for engineering staff' },
  { name: 'Contact Inquiries', slug: 'contacts', description: 'Sales leads, contact submissions and inquiry forms' },
  { name: 'Customer Support', slug: 'support', description: 'Support tickets, bug reports and client technical queries' },
  { name: 'Engineering Projects', slug: 'projects', description: 'Internal roadmap items, milestones and project tracking' },
  { name: 'Analytics & Reports', slug: 'reports', description: 'System health audit logs, financial summaries and metrics' },
  { name: 'Client Reviews', slug: 'reviews', description: 'Client testimonials, ratings and platform reviews' },
  { name: 'Spam Protection', slug: 'spams', description: 'Blacklisted IP addresses, spam triggers and audit blocks' },
  { name: 'Prospective Leads', slug: 'leads', description: 'Marketing prospective client pipelines and demo bookings' },
  { name: 'Newsletter Subscribers', slug: 'subscribers', description: 'Email mailing list subscribers and campaign targets' },
  { name: 'Platform Apps', slug: 'apps', description: 'Add-on software apps, integrations and plugin tools' },
  { name: 'Account Profile', slug: 'profile', description: 'Personal developer credentials and settings' },
  { name: 'System Settings', slug: 'settings', description: 'Platform branding, SMTP mailer, Cloudinary and webhooks' },
  { name: 'Knowledge Base FAQs', slug: 'faqs', description: 'Frequently asked questions and client self-help articles' },
  { name: 'System Updates', slug: 'updates', description: 'Release changelogs, maintenance announcements and patches' },
  { name: 'Developer Tasks', slug: 'tasks', description: 'Sprint assignments, issue tracking and developer todo lists' },
  { name: 'Platform Notices', slug: 'notices', description: 'Internal team bulletins, announcements and notices' },
  { name: 'Tutorials & Guides', slug: 'tutorials', description: 'Step-by-step developer guides and onboarding videos' },
  { name: 'Company Careers', slug: 'careers', description: 'Job openings, applicant tracking and recruitment posts' },
  { name: 'Terms & Policies', slug: 'policies', description: 'Privacy policies, terms of service and compliance documents' }
];

const rolesData = [
  { name: 'Super Admin', slug: 'admin', description: 'Full platform administrator with unrestricted access to all modules and configurations' },
  { name: 'Lead Developer', slug: 'developer', description: 'Software engineer with access to technical modules, apps, APIs and maintenance' },
  { name: 'Operations Manager', slug: 'manager', description: 'Platform manager with access to clients, billing, subscriptions and support' },
  { name: 'Marketing Specialist', slug: 'marketer', description: 'Marketing operator with access to blogs, themes, leads, reviews and newsletters' },
  { name: 'Support Specialist', slug: 'support', description: 'Customer care specialist with access to live chats, support tickets and inquiries' }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('--- Starting Seed Process ---');

    // 1. Seed Modules
    console.log('Seeding developer_modules...');
    const moduleMap = new Map();
    for (const m of modulesData) {
      const res = await client.query(
        `INSERT INTO developer_modules (name, slug, description, is_active, updated_at)
         VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
         ON CONFLICT (slug) DO UPDATE 
           SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         RETURNING id, slug`,
        [m.name, m.slug, m.description]
      );
      moduleMap.set(m.slug, res.rows[0].id);
    }
    console.log(`Seeded ${moduleMap.size} modules.`);

    // 2. Seed Module Permissions
    console.log('Seeding module_permissions...');
    const allPermissionIds = [];
    for (const m of modulesData) {
      const moduleId = moduleMap.get(m.slug);
      const permKeys = [m.slug, `${m.slug}.view`, `${m.slug}.manage`];
      for (const pk of permKeys) {
        const res = await client.query(
          `INSERT INTO module_permissions (module_id, name, permission_key, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (module_id, permission_key) DO UPDATE
             SET name = EXCLUDED.name, description = EXCLUDED.description
           RETURNING id`,
          [moduleId, `${m.name} (${pk})`, pk, `Allows access to ${pk}`]
        );
        allPermissionIds.push(res.rows[0].id);
      }
    }
    console.log(`Seeded ${allPermissionIds.length} module permissions.`);

    // 3. Seed Roles
    console.log('Seeding developer_roles...');
    const roleMap = new Map();
    for (const r of rolesData) {
      const res = await client.query(
        `INSERT INTO developer_roles (name, slug, description, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
         RETURNING id, slug`,
        [r.name, r.slug, r.description]
      );
      roleMap.set(r.slug, res.rows[0].id);
    }
    console.log(`Seeded ${roleMap.size} roles.`);

    // 4. Assign all permissions to Super Admin role
    const adminRoleId = roleMap.get('admin');
    for (const permId of allPermissionIds) {
      await client.query(
        `INSERT INTO developer_role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [adminRoleId, permId]
      );
    }
    console.log('Assigned all permissions to Super Admin role.');

    // 5. Seed Demo Developer: tanvir@gmail.com / 123
    console.log('Seeding Demo Developer tanvir@gmail.com...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123', salt);

    const devRes = await client.query(
      `INSERT INTO developers (
         role_id, name, email, phone, designation, password,
         bio, github_profile, linkedin_profile, is_active,
         two_factor_code, two_factor_expires, recovery_token, recovery_token_expires,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE
         SET role_id = EXCLUDED.role_id,
             name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             designation = EXCLUDED.designation,
             password = EXCLUDED.password,
             bio = EXCLUDED.bio,
             is_active = TRUE,
             two_factor_code = NULL,
             two_factor_expires = NULL,
             recovery_token = NULL,
             recovery_token_expires = NULL,
             updated_at = CURRENT_TIMESTAMP
       RETURNING id, name, email, designation, role_id, is_active`,
      [
        adminRoleId,
        'Tanvir Ahmmed',
        'tanvir@gmail.com',
        '+8801700000000',
        'Lead Software Engineer & Super Admin',
        passwordHash,
        'Platform Founder & Lead Full-Stack Architect',
        'https://github.com/tanvir',
        'https://linkedin.com/in/tanvir'
      ]
    );

    console.log('Demo Developer created:', devRes.rows[0]);

    await client.query('COMMIT');
    console.log('--- Seed Completed Successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

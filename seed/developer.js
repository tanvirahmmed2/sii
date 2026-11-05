const bcrypt = require('bcryptjs');
const { pool, query } = require('./db');

const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Unrestricted master platform developer access to all 41 modules and system settings',
    is_system: true,
  },
  {
    name: 'Full Stack Developer',
    slug: 'developer',
    description: 'Platform core engineer with access to tasks, websites, modules, templates, and releases',
    is_system: true,
  },
  {
    name: 'Support Specialist',
    slug: 'support-specialist',
    description: 'Customer help desk specialist handling live chats, tickets, contacts, and reports',
    is_system: true,
  },
  {
    name: 'Content Manager',
    slug: 'content-manager',
    description: 'Editorial and documentation manager for blogs, policies, FAQs, tutorials, and notices',
    is_system: true,
  },
  {
    name: 'Finance Administrator',
    slug: 'finance-admin',
    description: 'Billing administrator managing subscriptions, packages, payments, and payroll',
    is_system: true,
  },
];

/**
 * Seeds:
 * 1. Developer roles in `developer_roles`
 * 2. Role permissions in `developer_role_permissions`
 * 3. Super Admin developer in `developers` table with `role_id` assigned
 */
async function seedDeveloper(options = {}) {
  console.log('\n======================================================');
  console.log('3. SEEDING DEVELOPER ROLES, PERMISSIONS & ACCOUNTS');
  console.log('======================================================');

  // 1. Seed Developer Roles
  console.log(`-> Seeding ${SYSTEM_ROLES.length} system developer roles into "developer_roles"...`);
  const roleMap = {};
  for (const r of SYSTEM_ROLES) {
    const res = await query(
      `INSERT INTO developer_roles (name, slug, description, is_system, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_system = EXCLUDED.is_system,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, slug, name`,
      [r.name, r.slug, r.description, r.is_system]
    );
    roleMap[res.rows[0].slug] = res.rows[0].id;
  }
  console.log(`✓ Seeded ${Object.keys(roleMap).length} developer roles in "developer_roles".`);

  // 2. Fetch all modules to assign permissions by role
  const allModulesRes = await query('SELECT id, slug, name FROM modules ORDER BY id ASC');
  const allModules = allModulesRes.rows || [];

  const superAdminRoleId = roleMap['super-admin'];
  console.log(`-> Assigning full permissions across all ${allModules.length} modules to Super Admin role (#${superAdminRoleId})...`);
  let permsCount = 0;
  for (const mod of allModules) {
    await query(
      `INSERT INTO developer_role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete, updated_at)
       VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (role_id, module_id) DO UPDATE SET
         can_view = TRUE,
         can_create = TRUE,
         can_edit = TRUE,
         can_delete = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [superAdminRoleId, mod.id]
    );
    permsCount++;
  }
  console.log(`✓ Granted ${permsCount} permissions to Super Admin role in "developer_role_permissions".`);

  // Assign selective permissions for other roles
  const roleGrants = {
    developer: ['overview', 'developers', 'websites', 'blogs', 'themes', 'packages', 'features', 'modules', 'tasks', 'updates', 'notices', 'tutorials', 'templates', 'profile', 'settings'],
    'support-specialist': ['overview', 'live-chats', 'chats', 'contacts', 'support', 'reviews', 'reports', 'spams', 'leads', 'subscribers', 'profile'],
    'content-manager': ['overview', 'blogs', 'faqs', 'notices', 'tutorials', 'policies', 'updates', 'profile'],
    'finance-admin': ['overview', 'packages', 'purchases', 'payments', 'subscriptions', 'payroll', 'my-salaries', 'profile'],
  };

  for (const [roleSlug, modSlugs] of Object.entries(roleGrants)) {
    const roleId = roleMap[roleSlug];
    if (!roleId) continue;
    for (const mod of allModules) {
      const isAllowed = modSlugs.includes(mod.slug);
      await query(
        `INSERT INTO developer_role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete, updated_at)
         VALUES ($1, $2, $3, $4, $4, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (role_id, module_id) DO UPDATE SET
           can_view = EXCLUDED.can_view,
           can_create = EXCLUDED.can_create,
           can_edit = EXCLUDED.can_edit,
           can_delete = EXCLUDED.can_delete,
           updated_at = CURRENT_TIMESTAMP`,
        [roleId, mod.id, isAllowed, isAllowed]
      );
    }
  }
  console.log('✓ Configured module permissions for Developer, Support, Content, and Finance roles.');

  // 3. Seed / Ensure Developer Account
  const name = options.name || 'Tanvir Ahmmed';
  const email = (options.email || 'tanvir004006@gmail.com').toLowerCase().trim();
  const rawPassword = options.password || '12345678';
  const phone = options.phone || '+8801700000000';
  const designation = options.designation || 'Lead Software Engineer & Super Admin';

  console.log(`-> Ensuring developer account ${email} with Super Admin role...`);
  const existingDev = await query('SELECT id FROM developers WHERE email = $1', [email]);

  let devId;
  if (existingDev.rows.length === 0) {
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const insertRes = await query(
      `INSERT INTO developers (
         role_id, name, email, phone, designation, password,
         is_active, email_verified, bio, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, email, designation`,
      [superAdminRoleId, name, email, phone, designation, hashedPassword, 'Platform Super Admin & Lead Architect']
    );
    devId = insertRes.rows[0].id;
    console.log(`✓ Created new developer account #${devId} (${email}) with Super Admin role.`);
  } else {
    devId = existingDev.rows[0].id;
    await query(
      `UPDATE developers
       SET role_id = $1, name = $2, phone = $3, designation = $4, is_active = TRUE, email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [superAdminRoleId, name, phone, designation, devId]
    );
    console.log(`✓ Existing developer account #${devId} (${email}) linked to Super Admin role.`);
  }

  return {
    success: true,
    developer_id: devId,
    email,
    role_id: superAdminRoleId,
    roles_seeded: Object.keys(roleMap).length,
    permissions_granted: permsCount,
  };
}

if (require.main === module) {
  seedDeveloper()
    .then((res) => {
      console.log('\nDeveloper roles and account successfully seeded!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error seeding developer:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  seedDeveloper,
  SYSTEM_ROLES,
};

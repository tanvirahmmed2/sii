import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

// Explicit set of legacy / archive tables from previous system versions
const LEGACY_TABLES = new Set([
  'privacy_policies',
  'terms_and_conditions',
  'refund_conditions',
  'careers',
  'career_applications',
  'tenants',
  'staffs',
  'staff_salary',
  'staff_todos',
  'staff_notes',
  'staff_login_logs',
  'tickets',
  'ticket_messages',
  'ticket_attachments',
  'ticket_images',
  'ticket_participants',
  'supports',
  'client_leads',
  'business_leads',
  'news_letters',
  'users',
  'user_cart',
  'user_login_logs',
  'project_chats',
  'project_chats_files',
  'project_chats_images',
  'project_chats_messages',
  'project_chats_participants',
  'boards',
  'features',
  'package_features',
  'salary_payments',
  'payscale',
  'partners',
  'notifications',
  'activity_logs',
  'chats',
  'chat_attachments',
  'payments',
  'products',
]);

// Helper to convert table_name (e.g. 'website_products') to clean title
function formatTableToModuleTitle(tableName) {
  let clean = tableName;
  if (clean.startsWith('website_')) clean = clean.replace('website_', '');
  else if (clean.startsWith('tenant_')) clean = clean.replace('tenant_', '');

  // Detailed mapping for all system and website tables
  const titleMap = {
    // Website modules
    products: 'Products & Store',
    product_images: 'Product Gallery Images',
    purchase: 'Orders & Purchases',
    purchase_payments: 'Order Transactions',
    appointments: 'Appointments & Booking',
    blogs: 'Blog & Articles',
    blog_images: 'Blog Media Images',
    contact: 'Contact Inquiries',
    services: 'Services Offered',
    experiences: 'Experiences & Timeline',
    gallery: 'Portfolio Gallery',
    offers: 'Offers & Promo Codes',
    support: 'Support Tickets',
    support_messages: 'Support Ticket Messages',
    support_images: 'Support Ticket Attachments',
    testimonials: 'Client Testimonials',
    skills: 'Skills & Endorsements',
    categories: 'Content Categories',
    roles: 'Roles & Permissions',
    permissions: 'System Permissions',
    role_permissions: 'Role Permission Grants',
    users: 'Team & Users',
    user_roles: 'User Role Assignments',
    settings: 'Settings & Custom Domain',
    modules: 'Website Modules',

    // Platform Core modules
    apps: 'Ecosystem Apps',
    apps_images: 'App Showcase Media',
    app_modules: 'Application Modules',
    themes: 'Visual Themes',
    themes_images: 'Theme Showcase Media',
    packages: 'Subscription Packages',
    packages_feature: 'Package Features Mapping',
    feature: 'Platform Features',
    allowed_modules: 'Package Allowed Modules',
    subscription: 'Creator Subscriptions',
    purchases: 'Creator Purchases',
    payment: 'Payment Ledger',
    creators: 'Creator Accounts',
    developers: 'Developers Engineering Team',
    developer_roles: 'Developer Staff Roles',
    developer_payrolls: 'Developer Payroll Profiles',
    payrolls: 'Monthly Payrolls',
    payroll_payments: 'Payroll Disbursals',
    session: 'Staff Auth Sessions',
    login_activity: 'Security Login Activity',
    websites: 'Customer Websites',
    policies: 'Company Policies & Legal',
    career: 'Careers & Job Postings',
    career_application: 'Career Job Applications',
    tasks: 'Sprint Tasks',
    task_comments: 'Task Discussion Comments',
    notices: 'Company Broadcast Notices',
    blogs_image: 'Blog Media Gallery',
    tutorials: 'Video Academy Tutorials',
    updates: 'Product Release Notes',
    faqs: 'Help Center FAQs',
    contacts: 'Platform Contact Inquiries',
    project: 'Bespoke Custom Projects',
    project_images: 'Project Media Attachments',
    project_messages: 'Project Collaboration Messages',
    internal_chats: 'Internal Staff Chats',
    chat_messages: 'Chat Messages',
    chat_images: 'Chat Media',
    chat_participants: 'Chat Participants',
    live_chats: 'Real-time Live Chats',
    live_chat_messages: 'Live Chat Messages',
    meta_conversations: 'Meta Messenger Threads',
    meta_messages: 'Meta Inbound/Outbound Messages',
    leads: 'Sales & CRM Leads',
    subscribers: 'Newsletter Subscribers',
    reviews: 'Customer Reviews & Moderation',
    reports: 'Client Incident & Bug Reports',

    // Legacy tables
    privacy_policies: 'Legacy Privacy Policies',
    terms_and_conditions: 'Legacy Terms & Conditions',
    refund_conditions: 'Legacy Refund Policies',
    careers: 'Legacy Job Postings',
    career_applications: 'Legacy Candidate Applications',
    tenants: 'Legacy Customer Tenants',
    staffs: 'Legacy Staff Accounts',
    staff_salary: 'Legacy Staff Salaries',
    staff_todos: 'Legacy Staff Todos',
    staff_notes: 'Legacy Staff Notes',
    staff_login_logs: 'Legacy Staff Login Logs',
    tickets: 'Legacy Helpdesk Tickets',
    ticket_messages: 'Legacy Ticket Messages',
    ticket_attachments: 'Legacy Ticket Attachments',
    ticket_images: 'Legacy Ticket Images',
    ticket_participants: 'Legacy Ticket Participants',
    supports: 'Legacy Support Inquiries',
    client_leads: 'Legacy Client Leads',
    business_leads: 'Legacy Business Leads',
    news_letters: 'Legacy Newsletters',
    user_cart: 'Legacy Shopping Carts',
    user_login_logs: 'Legacy User Login Logs',
    project_chats: 'Legacy Project Chats',
    project_chats_files: 'Legacy Project Chat Files',
    project_chats_images: 'Legacy Project Chat Images',
    project_chats_messages: 'Legacy Project Chat Messages',
    project_chats_participants: 'Legacy Project Chat Participants',
    boards: 'Legacy Project Boards',
    features: 'Legacy Platform Features',
    package_features: 'Legacy Package Features',
    salary_payments: 'Legacy Salary Payments',
    payscale: 'Legacy Payscale Profiles',
    partners: 'Legacy Business Partners',
    notifications: 'Legacy Activity Notifications',
    activity_logs: 'Legacy System Activity Logs',
    chats: 'Legacy Simple Chats',
    chat_attachments: 'Legacy Chat Attachments',
    payments: 'Legacy Transaction Payments',
  };

  if (titleMap[clean]) return titleMap[clean];
  if (titleMap[tableName]) return titleMap[tableName];

  return clean
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'modules');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'website', 'platform', 'legacy'
    const inspectTable = searchParams.get('table');

    // If inspecting a specific table's schema and live sample rows
    if (inspectTable) {
      // Validate table name to avoid SQL injection
      const safeTableName = inspectTable.replace(/[^a-zA-Z0-9_]/g, '');

      const colRes = await queryDb(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position ASC`,
        [safeTableName]
      );

      let rowCount = 0;
      let sampleRows = [];
      try {
        const countRes = await queryDb(`SELECT COUNT(*)::int AS count FROM "${safeTableName}"`);
        rowCount = countRes.rows[0]?.count || 0;

        const sampleRes = await queryDb(`SELECT * FROM "${safeTableName}" LIMIT 5`);
        sampleRows = sampleRes.rows || [];
      } catch (err) {
        console.warn(`Could not fetch rows for table ${safeTableName}:`, err.message);
      }

      const isLegacy = LEGACY_TABLES.has(safeTableName) || safeTableName.startsWith('tenant_');
      const isWebsite = safeTableName.startsWith('website_');
      let category = 'platform';
      if (isWebsite) category = 'website';
      else if (isLegacy) category = 'legacy';

      return NextResponse.json({
        success: true,
        table_name: safeTableName,
        module_title: formatTableToModuleTitle(safeTableName),
        category,
        is_legacy: isLegacy,
        total_rows: rowCount,
        columns: colRes.rows,
        sample_rows: sampleRows,
      });
    }

    // Query database tables, column counts, and estimated row counts using PostgreSQL catalog
    const tablesRes = await queryDb(
      `SELECT 
         t.table_name,
         COALESCE(col.column_count, 0)::int AS columns_count,
         COALESCE(GREATEST(0, pc.reltuples::bigint), 0)::int AS estimated_rows
       FROM information_schema.tables t
       LEFT JOIN (
         SELECT table_name, COUNT(*) AS column_count
         FROM information_schema.columns
         WHERE table_schema = 'public'
         GROUP BY table_name
       ) col ON col.table_name = t.table_name
       LEFT JOIN (
         SELECT c.relname, c.reltuples
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'
       ) pc ON pc.relname = t.table_name
       WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
       ORDER BY t.table_name ASC`
    );

    // Deduplicate defensively by table_name
    const seen = new Set();
    const allTables = (tablesRes.rows || []).filter((t) => {
      if (seen.has(t.table_name)) return false;
      seen.add(t.table_name);
      return true;
    });

    // Map each database table into a module descriptor
    const modules = allTables.map((t) => {
      const isWebsiteModule = t.table_name.startsWith('website_');
      const isLegacy = LEGACY_TABLES.has(t.table_name) || t.table_name.startsWith('tenant_');
      const isChildOrRelation =
        t.table_name.includes('_images') ||
        t.table_name.includes('_messages') ||
        t.table_name.includes('_permissions') ||
        t.table_name.includes('_roles') ||
        t.table_name.includes('_payments') ||
        t.table_name.includes('_files') ||
        t.table_name.includes('_participants') ||
        t.table_name.includes('_attachments');

      let category = 'platform';
      if (isWebsiteModule) {
        category = 'website';
      } else if (isLegacy) {
        category = 'legacy';
      }

      // Check if primary website module suitable for package selection
      const isPrimary =
        isWebsiteModule &&
        !isChildOrRelation &&
        t.table_name !== 'website_modules';

      return {
        table_name: t.table_name,
        module_title: formatTableToModuleTitle(t.table_name),
        columns_count: t.columns_count,
        estimated_rows: t.estimated_rows,
        category,
        is_legacy: isLegacy,
        is_website_module: isWebsiteModule,
        is_child_table: isChildOrRelation,
        is_primary_module: isPrimary,
      };
    });

    // Extract selectable modules for packages from website primary modules
    const selectableModules = [
      'Products',
      'Orders & Payments',
      'Appointments',
      'Blog & Articles',
      'Contact Inquiries',
      'Roles & Permissions',
      'Team & Users',
      'Experiences',
      'Portfolio Gallery',
      'Services',
      'Offers & Discounts',
      'Support Tickets',
      'Settings & Domain',
    ];

    // Summary counts
    const websiteModules = modules.filter((m) => m.category === 'website');
    const platformModules = modules.filter((m) => m.category === 'platform');
    const legacyModules = modules.filter((m) => m.category === 'legacy');

    // Apply query filter if requested
    let filteredModules = modules;
    if (filter === 'website') {
      filteredModules = websiteModules;
    } else if (filter === 'platform') {
      filteredModules = platformModules;
    } else if (filter === 'legacy') {
      filteredModules = legacyModules;
    }

    return NextResponse.json({
      success: true,
      total_tables: allTables.length,
      counts: {
        total: allTables.length,
        website: websiteModules.length,
        platform: platformModules.length,
        legacy: legacyModules.length,
      },
      filter,
      modules: filteredModules,
      available_modules: selectableModules,
    });
  } catch (error) {
    console.error('Error querying database modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

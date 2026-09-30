import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

// Default standard educational tenant modules catalog
const DEFAULT_TENANT_MODULES = [
  {
    name: 'Student Information System (SIS)',
    slug: 'sis',
    description: 'Complete student profiles, enrollment, records, and student ID card generator',
    icon: 'BiUser',
  },
  {
    name: 'Attendance Tracker',
    slug: 'attendance',
    description: 'Daily automated student & staff attendance with SMS alerts and biometric support',
    icon: 'BiCalendarCheck',
  },
  {
    name: 'Examinations & Report Cards',
    slug: 'exams',
    description: 'Exam scheduling, question banks, online marks entry, and automated report cards',
    icon: 'BiAward',
  },
  {
    name: 'LMS & Study Materials',
    slug: 'lms',
    description: 'Digital syllabus, lecture notes, homework submission, and online video classes',
    icon: 'BiBookOpen',
  },
  {
    name: 'Fees & Online Collections',
    slug: 'fees',
    description: 'Tuition fee voucher generation, bKash/Nagad/Cards online payment gateway integration',
    icon: 'BiCreditCard',
  },
  {
    name: 'Accounting & Financial Ledger',
    slug: 'accounting',
    description: 'Institutional accounting, income/expense tracking, ledger, and balance sheets',
    icon: 'BiLineChart',
  },
  {
    name: 'Staff & Payroll Management',
    slug: 'staff-payroll',
    description: 'Teacher/employee profiles, leave management, monthly payroll and payslips',
    icon: 'BiGroup',
  },
  {
    name: 'Routine & Class Scheduling',
    slug: 'routine',
    description: 'Weekly dynamic routine generator, period management, and teacher load allocation',
    icon: 'BiTime',
  },
  {
    name: 'Notice & Broadcast System',
    slug: 'notices',
    description: 'Instant school broadcast notices, SMS/email announcements to parents',
    icon: 'BiBell',
  },
  {
    name: 'Hostel & Dormitory',
    slug: 'hostel',
    description: 'Hostel room allocations, fee tracking, and hostel warden logs',
    icon: 'BiBuilding',
  },
  {
    name: 'Transport & Fleet Tracking',
    slug: 'transport',
    description: 'Vehicle routes, stops, driver contacts, and student transport fees',
    icon: 'BiBus',
  },
  {
    name: 'Public Institutional Website',
    slug: 'website-builder',
    description: 'Dynamic frontend CMS, school landing page, about, achievements, and gallery',
    icon: 'BiDesktop',
  },
];

// Ensure table exists and has seed data
async function ensureTenantModulesCatalog() {
  await queryDb(`
    CREATE TABLE IF NOT EXISTS tenant_modules (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `).catch((err) => console.warn('tenant_modules table check:', err.message));

  const check = await queryDb('SELECT COUNT(*)::int AS count FROM tenant_modules').catch(() => ({ rows: [{ count: 0 }] }));
  const count = check.rows[0]?.count || 0;

  if (count === 0) {
    for (const mod of DEFAULT_TENANT_MODULES) {
      await queryDb(
        `INSERT INTO tenant_modules (name, slug, description, icon, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (slug) DO NOTHING`,
        [mod.name, mod.slug, mod.description, mod.icon]
      ).catch((e) => console.warn(`Error seeding tenant module ${mod.slug}:`, e.message));
    }
  }
}

export async function GET(request) {
  try {
    await ensureTenantModulesCatalog();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let sql = 'SELECT * FROM tenant_modules';
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push('is_active = TRUE');
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY id ASC';

    const res = await queryDb(sql, params).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      records: res.rows,
      modules: res.rows,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching tenant modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    await ensureTenantModulesCatalog();

    const body = await request.json();
    const data = body.data || body;
    const name = (data.name || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Module name is required' }, { status: 400 });
    }

    const baseSlug = slugify(data.slug || name, { lower: true, strict: true, trim: true }) || 'module';
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const check = await queryDb('SELECT id FROM tenant_modules WHERE slug = $1 LIMIT 1', [slug]);
      if (check.rows.length === 0) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const description = data.description || '';
    const icon = data.icon || 'BiLayer';
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

    const res = await queryDb(
      `INSERT INTO tenant_modules (name, slug, description, icon, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, slug, description, icon, isActive]
    );

    return NextResponse.json({
      success: true,
      message: 'Tenant module created successfully',
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

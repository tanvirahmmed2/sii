import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

// Canonical educational tenant modules catalog matching database schema & school operations
export const DEFAULT_TENANT_MODULES = [
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

let _hasSyncedDefaults = false;
async function ensureCanonicalWebsiteModules() {
  if (_hasSyncedDefaults) return;
  _hasSyncedDefaults = true;
  try {
    for (const m of DEFAULT_TENANT_MODULES) {
      await queryDb(
        `INSERT INTO website_modules (name, slug, description, icon, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon`,
        [m.name, m.slug, m.description, m.icon]
      ).catch(() => {});
    }
  } catch (err) {
    console.warn('[website_modules] Auto-sync warning:', err.message);
  }
}

export async function GET(request) {
  try {
    // Lazily ensure canonical modules exist
    await ensureCanonicalWebsiteModules();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let sql = 'SELECT * FROM website_modules';
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push('is_active = TRUE');
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(slug) LIKE $${params.length})`);
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
    console.error('Error fetching website modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

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
      const check = await queryDb('SELECT id FROM website_modules WHERE slug = $1 LIMIT 1', [slug]);
      if (check.rows.length === 0) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const description = data.description || '';
    const icon = data.icon || 'BiLayer';
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

    const res = await queryDb(
      `INSERT INTO website_modules (name, slug, description, icon, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, slug, description, icon, isActive]
    );

    return NextResponse.json({
      success: true,
      message: 'Website module created successfully',
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const id = data.id || new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM website_modules WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const name = data.name !== undefined ? data.name.trim() : current.name;
    const description = data.description !== undefined ? data.description : current.description;
    const icon = data.icon !== undefined ? data.icon : current.icon;
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE website_modules
       SET name = $1, description = $2, icon = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description, icon, isActive, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Website module updated successfully',
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating website module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required' }, { status: 400 });
    }

    await queryDb('DELETE FROM website_modules WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Website module deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting website module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

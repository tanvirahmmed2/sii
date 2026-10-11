import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

const DEFAULT_DAYS = [
  { name: 'Sunday', order: 1, status: 'on' },
  { name: 'Monday', order: 2, status: 'on' },
  { name: 'Tuesday', order: 3, status: 'on' },
  { name: 'Wednesday', order: 4, status: 'on' },
  { name: 'Thursday', order: 5, status: 'on' },
  { name: 'Friday', order: 6, status: 'off' },
  { name: 'Saturday', order: 7, status: 'off' }
];

// GET: List academic days (auto-seeds default 7 days if empty)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    let result = await queryDb(
      `SELECT d.*,
              COALESCE((SELECT COUNT(*) FROM website_periods p WHERE p.day_id = d.id), 0)::int AS period_count
       FROM website_days d
       WHERE d.website_id = $1
       ORDER BY d.day_order ASC, d.id ASC`,
      [auth.website.id]
    );

    // If no days exist yet, seed standard week
    if (result.rows.length === 0) {
      for (const d of DEFAULT_DAYS) {
        await queryDb(
          `INSERT INTO website_days (website_id, name, day_order, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (website_id, name) DO NOTHING`,
          [auth.website.id, d.name, d.order, d.status]
        );
      }

      result = await queryDb(
        `SELECT d.*,
                COALESCE((SELECT COUNT(*) FROM website_periods p WHERE p.day_id = d.id), 0)::int AS period_count
         FROM website_days d
         WHERE d.website_id = $1
         ORDER BY d.day_order ASC, d.id ASC`,
        [auth.website.id]
      );
    }

    return NextResponse.json({
      success: true,
      days: result.rows,
      payload: { days: result.rows }
    });
  } catch (error) {
    console.error('Error in GET days:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add custom day or re-seed standard schedule
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { name, day_order = 1, status = 'on', action } = body;

    if (action === 'reset_standard') {
      for (const d of DEFAULT_DAYS) {
        await queryDb(
          `INSERT INTO website_days (website_id, name, day_order, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (website_id, name) DO UPDATE SET
             day_order = EXCLUDED.day_order,
             status = EXCLUDED.status,
             updated_at = CURRENT_TIMESTAMP`,
          [auth.website.id, d.name, d.order, d.status]
        );
      }
      return NextResponse.json({ success: true, message: 'Standard 7 days reset successfully.' });
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Day name is required.' }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_days (website_id, name, day_order, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        auth.website.id,
        String(name).trim(),
        parseInt(day_order, 10) || 1,
        status === 'off' ? 'off' : 'on'
      ]
    );

    return NextResponse.json({
      success: true,
      day: insertRes.rows[0],
      message: 'Day added successfully.'
    });
  } catch (error) {
    console.error('Error in POST day:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A day with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update day status or order
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, name, day_order, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Day ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_days
       SET name = COALESCE($1, name),
           day_order = COALESCE($2, day_order),
           status = COALESCE($3, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND website_id = $5
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        day_order !== undefined ? parseInt(day_order, 10) : null,
        status !== undefined ? (status === 'off' ? 'off' : 'on') : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Day not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      day: updateRes.rows[0],
      message: 'Day configuration updated.'
    });
  } catch (error) {
    console.error('Error in PUT day:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove day
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Day ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_days WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Day not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Day and its scheduled periods deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE day:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

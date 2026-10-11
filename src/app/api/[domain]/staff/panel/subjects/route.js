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

  const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: List all subjects with assigned class counts
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const result = await queryDb(
      `SELECT s.*,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.subject_id = s.id), 0)::int AS class_count
       FROM website_subjects s
       WHERE s.website_id = $1
       ORDER BY s.name ASC`,
      [auth.website.id]
    );

    return NextResponse.json({
      success: true,
      subjects: result.rows,
      payload: { subjects: result.rows }
    });
  } catch (error) {
    console.error('Error in GET subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create subject
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { name, code, type = 'Theory', description = '' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Subject name is required.' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const trimmedCode = code && String(code).trim() 
      ? String(code).trim().toUpperCase() 
      : trimmedName.substring(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

    const validTypes = ['Theory', 'Practical', 'Both', 'Optional'];
    const validType = validTypes.includes(type) ? type : 'Theory';

    const insertRes = await queryDb(
      `INSERT INTO website_subjects (website_id, name, code, type, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        auth.website.id,
        trimmedName,
        trimmedCode,
        validType,
        description ? String(description).trim() : null
      ]
    );

    return NextResponse.json({
      success: true,
      subject: insertRes.rows[0],
      message: 'Subject created successfully.'
    });
  } catch (error) {
    console.error('Error in POST subject:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A subject with this name or code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update subject
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, name, code, type, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_subjects
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           type = COALESCE($3, type),
           description = COALESCE($4, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        code !== undefined ? String(code).trim().toUpperCase() : null,
        type !== undefined ? type : null,
        description !== undefined ? String(description).trim() : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subject: updateRes.rows[0],
      message: 'Subject updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT subject:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another subject already uses this name or code.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove subject
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_subjects WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subject deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

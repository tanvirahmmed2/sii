import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET all experiences for the authenticated staff
export async function GET() {
  try {
    const staff = await getStaffUser();
    if (!staff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = await query(
      'SELECT * FROM staff_experiences WHERE staff_id = $1 ORDER BY start_date DESC NULLS LAST',
      [staff.id]
    );
    return NextResponse.json({ success: true, paylod: { experiences: result.rows } });
  } catch (err) {
    console.error('staff experiences GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST add experience
export async function POST(request) {
  try {
    const staffMember = await getStaffUser();
    if (!staffMember) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, organization, start_date, end_date, is_current, description } = body;
    if (!title || !organization) return NextResponse.json({ success: false, error: 'Title and organization are required.' }, { status: 400 });

    const result = await query(
      `INSERT INTO staff_experiences (staff_id, title, organization, start_date, end_date, is_current, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [staffMember.id, title, organization, start_date || null, end_date || null, is_current || false, description || null]
    );
    return NextResponse.json({ success: true, message: 'Experience added.', paylod: { experience: result.rows[0] } }, { status: 201 });
  } catch (err) {
    console.error('staff experiences POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update experience
export async function PUT(request) {
  try {
    const staffMember = await getStaffUser();
    if (!staffMember) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, title, organization, start_date, end_date, is_current, description } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Experience ID required.' }, { status: 400 });

    const result = await query(
      `UPDATE staff_experiences
       SET title = COALESCE($1, title), organization = COALESCE($2, organization),
           start_date = $3, end_date = $4, is_current = $5, description = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND staff_id = $8 RETURNING *`,
      [title, organization, start_date || null, end_date || null, is_current || false, description || null, id, staffMember.id]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Experience updated.', paylod: { experience: result.rows[0] } });
  } catch (err) {
    console.error('staff experiences PUT error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE experience
export async function DELETE(request) {
  try {
    const staffMember = await getStaffUser();
    if (!staffMember) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Experience ID required.' }, { status: 400 });

    const result = await query(
      'DELETE FROM staff_experiences WHERE id = $1 AND staff_id = $2 RETURNING id',
      [id, staffMember.id]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Experience deleted.' });
  } catch (err) {
    console.error('staff experiences DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

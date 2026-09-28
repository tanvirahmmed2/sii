import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = await query(
      'SELECT * FROM admin_experiences WHERE admin_id = $1 ORDER BY start_date DESC NULLS LAST',
      [admin.id]
    );
    return NextResponse.json({ success: true, paylod: { experiences: result.rows } });
  } catch (err) {
    console.error('admin experiences GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, organization, start_date, end_date, is_current, description } = body;
    if (!title || !organization) return NextResponse.json({ success: false, error: 'Title and organization are required.' }, { status: 400 });

    const result = await query(
      `INSERT INTO admin_experiences (admin_id, title, organization, start_date, end_date, is_current, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [admin.id, title, organization, start_date || null, end_date || null, is_current || false, description || null]
    );
    return NextResponse.json({ success: true, message: 'Experience added.', paylod: { experience: result.rows[0] } }, { status: 201 });
  } catch (err) {
    console.error('admin experiences POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, title, organization, start_date, end_date, is_current, description } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Experience ID required.' }, { status: 400 });

    const result = await query(
      `UPDATE admin_experiences
       SET title = COALESCE($1, title), organization = COALESCE($2, organization),
           start_date = $3, end_date = $4, is_current = $5, description = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND admin_id = $8 RETURNING *`,
      [title, organization, start_date || null, end_date || null, is_current || false, description || null, id, admin.id]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Experience updated.', paylod: { experience: result.rows[0] } });
  } catch (err) {
    console.error('admin experiences PUT error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Experience ID required.' }, { status: 400 });

    const result = await query(
      'DELETE FROM admin_experiences WHERE id = $1 AND admin_id = $2 RETURNING id',
      [id, admin.id]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Experience deleted.' });
  } catch (err) {
    console.error('admin experiences DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

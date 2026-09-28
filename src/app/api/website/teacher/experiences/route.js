import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

async function getTeacherId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('fit-teacher')?.value;
  if (!token) return null;
  const decoded = verifyJWT(token);
  return decoded?.id || null;
}

// GET all experiences for the authenticated teacher
export async function GET() {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = await query(
      'SELECT * FROM teacher_experiences WHERE teacher_id = $1 ORDER BY start_date DESC NULLS LAST',
      [teacherId]
    );
    return NextResponse.json({ success: true, paylod: { experiences: result.rows } });
  } catch (err) {
    console.error('teacher experiences GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST add a new experience
export async function POST(request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, organization, start_date, end_date, is_current, description } = body;
    if (!title || !organization) return NextResponse.json({ success: false, error: 'Title and organization are required.' }, { status: 400 });

    const result = await query(
      `INSERT INTO teacher_experiences (teacher_id, title, organization, start_date, end_date, is_current, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [teacherId, title, organization, start_date || null, end_date || null, is_current || false, description || null]
    );
    return NextResponse.json({ success: true, message: 'Experience added.', paylod: { experience: result.rows[0] } }, { status: 201 });
  } catch (err) {
    console.error('teacher experiences POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update an existing experience
export async function PUT(request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, title, organization, start_date, end_date, is_current, description } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Experience ID required.' }, { status: 400 });

    const result = await query(
      `UPDATE teacher_experiences
       SET title = COALESCE($1, title), organization = COALESCE($2, organization),
           start_date = $3, end_date = $4, is_current = $5, description = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND teacher_id = $8 RETURNING *`,
      [title, organization, start_date || null, end_date || null, is_current || false, description || null, id, teacherId]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Experience updated.', paylod: { experience: result.rows[0] } });
  } catch (err) {
    console.error('teacher experiences PUT error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE remove an experience
export async function DELETE(request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Experience ID required.' }, { status: 400 });

    const result = await query(
      'DELETE FROM teacher_experiences WHERE id = $1 AND teacher_id = $2 RETURNING id',
      [id, teacherId]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Experience deleted.' });
  } catch (err) {
    console.error('teacher experiences DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

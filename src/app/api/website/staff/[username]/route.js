import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET public staff profile by username OR numeric id
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    const isNumeric = /^\d+$/.test(username);

    const result = await query(`
      SELECT id, name, email, COALESCE(phone, number) AS phone, COALESCE(number, phone) AS number,
             role, address, image, date_of_birth, nationality, blood_group, gender, bio, username,
             is_active, created_at
      FROM staffs
      WHERE (${isNumeric ? 'id = $1' : 'username = $1'}) AND is_active = TRUE
    `, [username]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    const staffMember = result.rows[0];

    const expRes = await query(
      'SELECT * FROM staff_experiences WHERE staff_id = $1 ORDER BY start_date DESC NULLS LAST',
      [staffMember.id]
    );

    return NextResponse.json({
      success: true,
      paylod: { staff: { ...staffMember, experiences: expRes.rows } }
    });
  } catch (err) {
    console.error('public staff profile error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

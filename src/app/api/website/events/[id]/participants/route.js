import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// GET participants for a specific event (Admin or Registrar)
export async function GET(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_310 = { error: 'Unauthorized. Admins or Registrars only.' };
      return NextResponse.json({
        success: false,
        message: res_err_310?.error || res_err_310?.message || 'An error occurred',
        error: res_err_310?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
         s.id, 
         s.name, 
         s.email, 
         s.registration_number, 
         s.roll,
         c.name AS class_name,
         sec.name AS section_name,
         ep.joined_at 
       FROM event_participants ep 
       JOIN students s ON ep.student_id = s.id 
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE ep.event_id = $1
       ORDER BY ep.joined_at DESC`,
      [id]
    );

    const res_data_755 = { participants: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_755?.message || 'Successfully fetched event participants',
      paylod: res_data_755,
      payload: res_data_755
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    const res_err_1356 = { error: 'Failed to retrieve event participants. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_1356?.error || res_err_1356?.message || 'An error occurred',
      error: res_err_1356?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

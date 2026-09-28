import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, isStudent } from '@/lib/auth';
import { query } from '@/lib/db';

// GET all events and join status for logged-in student
export async function GET() {
  try {
    const authenticated = await isStudent();
    if (!authenticated) {
      const res_err_348 = { error: 'Unauthorized. Students only.' };
      return NextResponse.json({
        success: false,
        message: res_err_348?.error || res_err_348?.message || 'An error occurred',
        error: res_err_348?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) {
      const res_err_791 = { error: 'Not authenticated' };
      return NextResponse.json({
        success: false,
        message: res_err_791?.error || res_err_791?.message || 'An error occurred',
        error: res_err_791?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_1180 = { error: 'Invalid token' };
      return NextResponse.json({
        success: false,
        message: res_err_1180?.error || res_err_1180?.message || 'An error occurred',
        error: res_err_1180?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const studentId = decoded.id;

    // Fetch all events
    const eventsRes = await query('SELECT * FROM events ORDER BY event_date ASC');

    // Fetch student's joined events
    const joinedRes = await query('SELECT event_id FROM event_participants WHERE student_id = $1', [studentId]);
    const joinedEventIds = joinedRes.rows.map(row => String(row.event_id));

    const res_data_1218 = {
      events: eventsRes.rows,
      joinedEventIds
    };
      return NextResponse.json({
        success: true,
        message: res_data_1218?.message || 'Successfully fecthed data',
        paylod: res_data_1218
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student events:', error);
    const res_err_2310 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_2310?.error || res_err_2310?.message || 'An error occurred',
        error: res_err_2310?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST join or leave an event (Students only)
export async function POST(request) {
  try {
    const authenticated = await isStudent();
    if (!authenticated) {
      const res_err_2798 = { error: 'Unauthorized. Students only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2798?.error || res_err_2798?.message || 'An error occurred',
        error: res_err_2798?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) {
      const res_err_3245 = { error: 'Not authenticated' };
      return NextResponse.json({
        success: false,
        message: res_err_3245?.error || res_err_3245?.message || 'An error occurred',
        error: res_err_3245?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_3638 = { error: 'Invalid token' };
      return NextResponse.json({
        success: false,
        message: res_err_3638?.error || res_err_3638?.message || 'An error occurred',
        error: res_err_3638?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const studentId = decoded.id;
    const { event_id, action } = await request.json();

    if (!event_id || !action || !['join', 'leave'].includes(action)) {
      const res_err_4115 = { error: 'event_id and action (join/leave) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_4115?.error || res_err_4115?.message || 'An error occurred',
        error: res_err_4115?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    if (action === 'join') {
      await query(
        'INSERT INTO event_participants (event_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [event_id, studentId]
      );
      const res_data_2849 = { message: 'Successfully registered for the event.' };
      return NextResponse.json({
        success: true,
        message: res_data_2849?.message || 'Successfully fecthed data',
        paylod: res_data_2849
      }, { status: 200 });
    } else {
      await query(
        'DELETE FROM event_participants WHERE event_id = $1 AND student_id = $2',
        [event_id, studentId]
      );
      const res_data_3365 = { message: 'Successfully cancelled event registration.' };
      return NextResponse.json({
        success: true,
        message: res_data_3365?.message || 'Successfully fecthed data',
        paylod: res_data_3365
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error modifying event participation:', error);
    const res_err_5628 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_5628?.error || res_err_5628?.message || 'An error occurred',
        error: res_err_5628?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

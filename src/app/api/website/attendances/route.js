import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// Helper to normalize status codes from XLSX or form inputs
function normalizeStatus(status) {
  if (!status) return 'Present';
  const s = String(status).trim().toUpperCase();
  if (s === 'P' || s === 'PRESENT') return 'Present';
  if (s === 'A' || s === 'ABSENT') return 'Absent';
  if (s === 'L' || s === 'LATE') return 'Late';
  if (s === 'V' || s === 'LEAVE' || s === 'ON LEAVE') return 'On Leave';
  return 'Present';
}

// GET teacher attendances (by month, date, or all)
export async function GET(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (month) {
      // Monthly attendance logs for teachers
      const logsRes = await query(
        `SELECT ta.*, t.name as teacher_name, t.email as teacher_email
         FROM teacher_attendances ta
         JOIN teachers t ON ta.teacher_id = t.id
         WHERE TO_CHAR(ta.date, 'YYYY-MM') = $1
         ORDER BY ta.date ASC, t.name ASC`,
        [month]
      );

      const teachersRes = await query(
        `SELECT id AS teacher_id, name, email, designation 
         FROM teachers 
         WHERE is_active = TRUE 
         ORDER BY name ASC`
      );

      return NextResponse.json({
        success: true,
        paylod: { 
          teachersList: teachersRes.rows,
          attendanceLogs: logsRes.rows 
        }
      }, { status: 200 });
    } else if (date) {
      const logsRes = await query(
        `SELECT ta.*, t.name as teacher_name, t.email as teacher_email
         FROM teacher_attendances ta
         JOIN teachers t ON ta.teacher_id = t.id
         WHERE ta.date = $1
         ORDER BY t.name ASC`,
        [date]
      );

      return NextResponse.json({
        success: true,
        paylod: { attendances: logsRes.rows }
      }, { status: 200 });
    } else {
      const result = await query(
        `SELECT ta.*, t.name as teacher_name, t.email as teacher_email
         FROM teacher_attendances ta
         JOIN teachers t ON ta.teacher_id = t.id
         ORDER BY ta.date DESC, t.name ASC
         LIMIT 500`
      );

      return NextResponse.json({
        success: true,
        paylod: { attendances: result.rows }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching teacher attendances:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// POST bulk save/override teacher attendance marked by Admin (via form or XLSX sheet)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { date, records } = await request.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'Records array is required.' }, { status: 400 });
    }

    let savedCount = 0;
    for (const record of records) {
      const recordDate = record.date || date;
      const teacherId = record.teacher_id;
      const rawStatus = record.status;
      const checkIn = record.check_in || null;
      const checkOut = record.check_out || null;

      if (!teacherId || !recordDate) continue;
      const status = normalizeStatus(rawStatus);

      await query(
        `INSERT INTO teacher_attendances (teacher_id, date, status, check_in, check_out)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (teacher_id, date)
         DO UPDATE SET
           status = EXCLUDED.status,
           check_in = EXCLUDED.check_in,
           check_out = EXCLUDED.check_out,
           updated_at = CURRENT_TIMESTAMP`,
        [
          parseInt(teacherId, 10),
          recordDate,
          status,
          checkIn,
          checkOut
        ]
      );
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCount} teacher attendance record(s).`
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving teacher attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

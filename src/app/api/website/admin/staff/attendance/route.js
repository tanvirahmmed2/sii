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

// GET staff members and their attendance logs (by single date or full month)
export async function GET(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (month) {
      // Monthly attendance records for all staff
      const startDate = `${month}-01`;
      const result = await query(
        `SELECT s.id AS staff_id, s.name, s.email, s.role,
                a.id AS attendance_id, a.date, a.check_in, a.check_out, a.status
         FROM staffs s
         LEFT JOIN staff_attendance a ON s.id = a.staff_id AND TO_CHAR(a.date, 'YYYY-MM') = $1
         WHERE s.is_active = TRUE AND s.is_registered = TRUE
         ORDER BY s.name ASC, a.date ASC`,
        [month]
      );

      // Also get all registered active staff list
      const staffRes = await query(
        `SELECT id AS staff_id, name, email, role 
         FROM staffs 
         WHERE is_active = TRUE AND is_registered = TRUE 
         ORDER BY name ASC`
      );

      return NextResponse.json({
        success: true,
        paylod: { 
          staffList: staffRes.rows,
          attendanceLogs: result.rows 
        }
      }, { status: 200 });
    } else {
      // Single date query
      const targetDate = date || new Date().toISOString().split('T')[0];
      const result = await query(
        `SELECT s.id AS staff_id, s.name, s.email, s.role,
                a.id AS attendance_id, a.date, a.check_in, a.check_out, a.status
         FROM staffs s
         LEFT JOIN staff_attendance a ON s.id = a.staff_id AND a.date = $1
         WHERE s.is_active = TRUE AND s.is_registered = TRUE
         ORDER BY s.name ASC`,
        [targetDate]
      );

      return NextResponse.json({
        success: true,
        paylod: { staffAttendance: result.rows }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching admin staff attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// POST bulk save/override staff attendance marked by Admin (via form or XLSX sheet)
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
      const staffId = record.staff_id;
      const rawStatus = record.status;
      const checkIn = record.check_in || null;
      const checkOut = record.check_out || null;

      if (!staffId || !recordDate) continue;
      const status = normalizeStatus(rawStatus);

      await query(
        `INSERT INTO staff_attendance (staff_id, date, status, check_in, check_out)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (staff_id, date)
         DO UPDATE SET
           status = EXCLUDED.status,
           check_in = EXCLUDED.check_in,
           check_out = EXCLUDED.check_out,
           updated_at = CURRENT_TIMESTAMP`,
        [
          parseInt(staffId, 10),
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
      message: `Successfully saved ${savedCount} staff attendance record(s).`
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving admin staff attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

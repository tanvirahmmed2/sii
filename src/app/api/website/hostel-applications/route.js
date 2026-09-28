import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister, isStudent, getStudentUser } from '@/lib/auth';

// GET hostel applications
export async function GET(request) {
  try {
    const adminAuth = await isAdmin();
    const regAuth = await isRegister();
    const studentUser = await getStudentUser();

    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get('status');

    if (studentUser && !adminAuth && !regAuth) {
      // Student viewing their own application status & active allocation status
      const studentId = studentUser.id;

      const stRes = await query('SELECT gender FROM students WHERE id = $1', [studentId]);
      const studentGender = stRes.rows[0]?.gender || null;

      const appRes = await query(
        `SELECT ha.*, h.name AS preferred_hostel_name, h.gender AS preferred_hostel_gender
         FROM hostel_applications ha
         LEFT JOIN hostels h ON ha.preferred_hostel_id = h.id
         WHERE ha.student_id = $1
         ORDER BY ha.applied_at DESC`,
        [studentId]
      );

      const allocRes = await query(
        `SELECT ha.*, hs.seat_code, hs.one_time_fee, hs.monthly_fee, hr.room_number, hr.floor, h.name AS hostel_name
         FROM hostel_allocations ha
         JOIN hostel_seats hs ON ha.seat_id = hs.id
         JOIN hostel_rooms hr ON hs.room_id = hr.id
         JOIN hostels h ON hr.hostel_id = h.id
         WHERE ha.student_id = $1 AND ha.status = 'active'`,
        [studentId]
      );

      return NextResponse.json({
        success: true,
        payload: {
          applications: appRes.rows,
          activeAllocation: allocRes.rows[0] || null,
          isAllocated: allocRes.rows.length > 0,
          studentGender
        },
        paylod: {
          applications: appRes.rows,
          activeAllocation: allocRes.rows[0] || null,
          isAllocated: allocRes.rows.length > 0,
          studentGender
        }
      });
    }

    if (!adminAuth && !regAuth) {
      return NextResponse.json({ success: false, error: 'Unauthorized access.' }, { status: 403 });
    }

    // Admin / Registrar view all applications
    let sql = `
      SELECT 
        hap.id,
        hap.student_id,
        hap.preferred_hostel_id,
        hap.reason,
        hap.status,
        hap.applied_at,
        hap.reviewed_at,
        hap.reviewed_by,
        s.name AS student_name,
        s.registration_number AS student_reg,
        s.gender AS student_gender,
        c.name AS class_name,
        h.name AS preferred_hostel_name,
        h.gender AS hostel_gender,
        (
          SELECT COUNT(*) 
          FROM hostel_allocations ha_curr 
          WHERE ha_curr.student_id = s.id AND ha_curr.status = 'active'
        ) > 0 AS is_currently_allocated
      FROM hostel_applications hap
      JOIN students s ON hap.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN hostels h ON hap.preferred_hostel_id = h.id
    `;
    let params = [];

    if (filterStatus) {
      params.push(filterStatus);
      sql += ` WHERE hap.status = $1`;
    }

    sql += ` ORDER BY hap.applied_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      payload: { applications: result.rows },
      paylod: { applications: result.rows }
    });
  } catch (error) {
    console.error('Error fetching hostel applications:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST submit new hostel application (Student or Admin)
export async function POST(request) {
  try {
    const studentUser = await getStudentUser();
    const adminAuth = await isAdmin();
    const regAuth = await isRegister();

    const body = await request.json();
    const targetStudentId = studentUser ? studentUser.id : body.student_id;

    if (!targetStudentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required.' }, { status: 400 });
    }

    // Check student existence & active status
    const stRes = await query('SELECT id, name, gender, is_active FROM students WHERE id = $1', [targetStudentId]);
    if (stRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    // CRITICAL VALIDATION: Check if student ALREADY has an active seat allocation in ANY room/hall
    const activeAllocRes = await query(
      `SELECT ha.id, hs.seat_code, h.name AS hostel_name 
       FROM hostel_allocations ha
       JOIN hostel_seats hs ON ha.seat_id = hs.id
       JOIN hostel_rooms hr ON hs.room_id = hr.id
       JOIN hostels h ON hr.hostel_id = h.id
       WHERE ha.student_id = $1 AND ha.status = 'active'`,
      [targetStudentId]
    );

    if (activeAllocRes.rows.length > 0) {
      const alloc = activeAllocRes.rows[0];
      return NextResponse.json({
        success: false,
        error: `Allocation Blocked: Student is currently allocated to Seat ${alloc.seat_code} in ${alloc.hostel_name}. Only unallocated students can apply for hostel seats.`
      }, { status: 400 });
    }

    // Check if student already has a pending application
    const pendingAppRes = await query(
      "SELECT id FROM hostel_applications WHERE student_id = $1 AND status = 'pending'",
      [targetStudentId]
    );

    if (pendingAppRes.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'You already have a pending hostel application submitted under review.'
      }, { status: 400 });
    }

    const { preferred_hostel_id, reason } = body;

    // Strict gender validation against preferred hostel
    if (preferred_hostel_id) {
      const hostelRes = await query('SELECT id, name, gender FROM hostels WHERE id = $1', [preferred_hostel_id]);
      if (hostelRes.rows.length > 0) {
        const studentGender = stRes.rows[0]?.gender || '';
        const hostelGender = hostelRes.rows[0]?.gender || 'Both';

        const sG = String(studentGender).trim().toLowerCase();
        const hG = String(hostelGender).trim().toLowerCase();

        const isFemaleStudent = sG === 'female' || sG === 'f' || sG.includes('female');
        const isMaleStudent = !isFemaleStudent; // Male or default

        const isMaleHostel = hG === 'male' || (hG.includes('male') && !hG.includes('female'));
        const isFemaleHostel = hG === 'female' || hG.includes('female');

        if (isMaleHostel && isFemaleStudent) {
          return NextResponse.json({
            success: false,
            error: `Gender Mismatch Blocked: Female students cannot apply for ${hostelRes.rows[0].name} (${hostelGender}-only hall).`
          }, { status: 400 });
        }

        if (isFemaleHostel && !isFemaleStudent) {
          return NextResponse.json({
            success: false,
            error: `Gender Mismatch Blocked: Male students cannot apply for ${hostelRes.rows[0].name} (${hostelGender}-only hall).`
          }, { status: 400 });
        }
      }
    }

    const newAppRes = await query(
      `INSERT INTO hostel_applications (student_id, preferred_hostel_id, reason, status, applied_at)
       VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
       RETURNING *`,
      [targetStudentId, preferred_hostel_id || null, reason || 'Hostel seat application']
    );

    return NextResponse.json({
      success: true,
      message: 'Hostel seat application submitted successfully!',
      payload: { application: newAppRes.rows[0] },
      paylod: { application: newAppRes.rows[0] }
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting hostel application:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

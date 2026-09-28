import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// GET active allocations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const hostelId = searchParams.get('hostel_id');
    const status = searchParams.get('status') || 'active';

    let sql = `
      SELECT 
        ha.id,
        ha.student_id,
        ha.seat_id,
        ha.allocated_at,
        ha.status AS allocation_status,
        ha.allocated_by_role,
        s.name AS student_name,
        s.registration_number AS student_reg,
        s.email AS student_email,
        s.gender AS student_gender,
        c.name AS class_name,
        hs.seat_code,
        hs.one_time_fee,
        hs.monthly_fee,
        hr.room_number,
        hr.floor,
        hr.room_type,
        h.id AS hostel_id,
        h.name AS hostel_name,
        h.gender AS hostel_gender
      FROM hostel_allocations ha
      JOIN students s ON ha.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN hostel_seats hs ON ha.seat_id = hs.id
      JOIN hostel_rooms hr ON hs.room_id = hr.id
      JOIN hostels h ON hr.hostel_id = h.id
    `;
    let params = [];
    let conditions = [];

    if (status !== 'all') {
      params.push(status);
      conditions.push(`ha.status = $${params.length}`);
    }

    if (studentId) {
      params.push(studentId);
      conditions.push(`ha.student_id = $${params.length}`);
    }

    if (hostelId) {
      params.push(hostelId);
      conditions.push(`h.id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY ha.allocated_at DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched hostel allocations',
      payload: { allocations: result.rows },
      paylod: { allocations: result.rows }
    });
  } catch (error) {
    console.error('Error fetching hostel allocations:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST allocate seat to student
export async function POST(request) {
  try {
    const adminAuth = await isAdmin();
    const regAuth = await isRegister();

    if (!adminAuth && !regAuth) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Admins and Registrars only.'
      }, { status: 403 });
    }

    const roleLabel = adminAuth ? 'admin' : 'registrar';

    const { student_id, seat_id } = await request.json();

    if (!student_id || !seat_id) {
      return NextResponse.json({
        success: false,
        error: 'Student ID and Seat ID are required.'
      }, { status: 400 });
    }

    // Check student existence and gender
    const stCheck = await query('SELECT id, name, registration_number, gender FROM students WHERE id = $1', [student_id]);
    if (stCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }
    const studentInfo = stCheck.rows[0];

    // Check existing active allocation for this student
    const activeAlloc = await query("SELECT id FROM hostel_allocations WHERE student_id = $1 AND status = 'active'", [student_id]);
    if (activeAlloc.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'This student already has an active hostel seat allocation. Use the Transfer action to move seats.'
      }, { status: 400 });
    }

    // Check seat existence, availability, and hostel gender restriction
    const seatCheck = await query(
      `SELECT hs.*, hr.room_number, h.name AS hostel_name, h.gender AS hostel_gender 
       FROM hostel_seats hs
       JOIN hostel_rooms hr ON hs.room_id = hr.id
       JOIN hostels h ON hr.hostel_id = h.id
       WHERE hs.id = $1`,
      [seat_id]
    );

    if (seatCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Hostel seat not found.' }, { status: 404 });
    }

    const seatInfo = seatCheck.rows[0];
    if (seatInfo.status !== 'available') {
      return NextResponse.json({
        success: false,
        error: `Seat ${seatInfo.seat_code} is not available for allocation (Current status: ${seatInfo.status}).`
      }, { status: 400 });
    }

    // Gender Check Validation
    const studentGender = (studentInfo.gender || '').trim();
    const hostelGender = (seatInfo.hostel_gender || 'Both').trim();

    const sG = studentGender.toLowerCase();
    const hG = hostelGender.toLowerCase();

    const isFemaleStudent = sG.includes('female') || sG === 'f' || sG === 'woman';
    const isMaleStudent = !isFemaleStudent && (sG.includes('male') || sG === 'm' || sG === 'man');

    const isMaleHostel = hG === 'male' || (hG.includes('male') && !hG.includes('female'));
    const isFemaleHostel = hG === 'female' || hG.includes('female');

    if (isMaleHostel && !isMaleStudent) {
      return NextResponse.json({
        success: false,
        error: `Gender Mismatch Blocked: Only explicitly Male students can be allocated to ${seatInfo.hostel_name} (${hostelGender}-only hall).`
      }, { status: 400 });
    }

    if (isFemaleHostel && !isFemaleStudent) {
      return NextResponse.json({
        success: false,
        error: `Gender Mismatch Blocked: Only explicitly Female students can be allocated to ${seatInfo.hostel_name} (${hostelGender}-only hall).`
      }, { status: 400 });
    }

    // Insert Allocation Record
    const allocRes = await query(
      `INSERT INTO hostel_allocations (student_id, seat_id, allocated_at, status, allocated_by_role)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'active', $3)
       RETURNING *`,
      [student_id, seat_id, roleLabel]
    );

    // Update Seat Status
    await query("UPDATE hostel_seats SET status = 'allocated', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [seat_id]);

    // Fees Integration: Add one-time fee and current monthly fee to student_fees table
    const generatedFees = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    const oneTimeVal = parseFloat(seatInfo.one_time_fee) || 0;
    const monthlyVal = parseFloat(seatInfo.monthly_fee) || 0;

    if (oneTimeVal > 0) {
      const feeIns = await query(
        `INSERT INTO student_fees (student_id, title, amount, paid_amount, due_date, status)
         VALUES ($1, $2, $3, 0.00, $4, 'unpaid')
         RETURNING *`,
        [
          student_id,
          `Hostel One-Time Allocation Fee (${seatInfo.hostel_name} - Seat ${seatInfo.seat_code})`,
          oneTimeVal,
          formattedDueDate
        ]
      );
      generatedFees.push(feeIns.rows[0]);
    }

    if (monthlyVal > 0) {
      const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const feeIns = await query(
        `INSERT INTO student_fees (student_id, title, amount, paid_amount, due_date, status)
         VALUES ($1, $2, $3, 0.00, $4, 'unpaid')
         RETURNING *`,
        [
          student_id,
          `Hostel Monthly Fee (${currentMonthYear}) - Seat ${seatInfo.seat_code}`,
          monthlyVal,
          formattedDueDate
        ]
      );
      generatedFees.push(feeIns.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `Seat ${seatInfo.seat_code} successfully allocated to student. Fees generated for Cashier clearance.`,
      payload: {
        allocation: allocRes.rows[0],
        fees: generatedFees
      },
      paylod: {
        allocation: allocRes.rows[0],
        fees: generatedFees
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error allocating hostel seat:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

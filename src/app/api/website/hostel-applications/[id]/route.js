import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const adminAuth = await isAdmin();
    const regAuth = await isRegister();

    if (!adminAuth && !regAuth) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins and Registrars only.' }, { status: 403 });
    }

    const reviewerRole = adminAuth ? 'admin' : 'registrar';
    const { id } = await params;
    const { status, seat_id, rejection_reason } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: "Status must be 'approved' or 'rejected'." }, { status: 400 });
    }

    // Check application existence
    const appRes = await query(
      `SELECT hap.*, s.name AS student_name, s.gender AS student_gender
       FROM hostel_applications hap
       JOIN students s ON hap.student_id = s.id
       WHERE hap.id = $1`,
      [id]
    );

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Hostel application not found.' }, { status: 404 });
    }

    const appInfo = appRes.rows[0];

    if (status === 'rejected') {
      const updatedApp = await query(
        `UPDATE hostel_applications
         SET status = 'rejected', reason = COALESCE($1, reason), reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [rejection_reason || 'Application rejected by administration.', reviewerRole, id]
      );

      return NextResponse.json({
        success: true,
        message: 'Application rejected.',
        payload: { application: updatedApp.rows[0] },
        paylod: { application: updatedApp.rows[0] }
      });
    }

    // APPROVAL WORKFLOW
    if (!seat_id) {
      return NextResponse.json({
        success: false,
        error: 'Seat selection (seat_id) is required to approve a hostel application.'
      }, { status: 400 });
    }

    // 1. CRITICAL CHECK: Verify student is NOT ALREADY allocated to any room/hall
    const activeAllocRes = await query(
      `SELECT ha.id, hs.seat_code, h.name AS hostel_name 
       FROM hostel_allocations ha
       JOIN hostel_seats hs ON ha.seat_id = hs.id
       JOIN hostel_rooms hr ON hs.room_id = hr.id
       JOIN hostels h ON hr.hostel_id = h.id
       WHERE ha.student_id = $1 AND ha.status = 'active'`,
      [appInfo.student_id]
    );

    if (activeAllocRes.rows.length > 0) {
      const alloc = activeAllocRes.rows[0];
      return NextResponse.json({
        success: false,
        error: `Approval Failed: Student ${appInfo.student_name} is already allocated to Seat ${alloc.seat_code} in ${alloc.hostel_name}. Students cannot hold multiple active allocations.`
      }, { status: 400 });
    }

    // 2. Check target seat existence, availability, and gender restriction
    const seatRes = await query(
      `SELECT hs.*, hr.room_number, h.name AS hostel_name, h.gender AS hostel_gender
       FROM hostel_seats hs
       JOIN hostel_rooms hr ON hs.room_id = hr.id
       JOIN hostels h ON hr.hostel_id = h.id
       WHERE hs.id = $1`,
      [seat_id]
    );

    if (seatRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Target seat not found.' }, { status: 404 });
    }

    const seatInfo = seatRes.rows[0];
    if (seatInfo.status !== 'available') {
      return NextResponse.json({
        success: false,
        error: `Seat ${seatInfo.seat_code} is not available (Current status: ${seatInfo.status}).`
      }, { status: 400 });
    }

    // 3. Gender Check Validation
    const studentGender = (appInfo.student_gender || '').trim();
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

    // 4. Allocate Seat & Update Seat Status
    const allocRes = await query(
      `INSERT INTO hostel_allocations (student_id, seat_id, allocated_at, status, allocated_by_role)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'active', $3)
       RETURNING *`,
      [appInfo.student_id, seat_id, reviewerRole]
    );

    await query("UPDATE hostel_seats SET status = 'allocated', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [seat_id]);

    // 5. Update Application Record
    const updatedApp = await query(
      `UPDATE hostel_applications
       SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewerRole, id]
    );

    // 6. Generate Cashier Fee Invoices
    const generatedFees = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    const oneTimeVal = parseFloat(seatInfo.one_time_fee) || 0;
    const monthlyVal = parseFloat(seatInfo.monthly_fee) || 0;

    if (oneTimeVal > 0) {
      const feeIns = await query(
        `INSERT INTO student_fees (student_id, title, amount, paid_amount, due_date, status)
         VALUES ($1, $2, $3, 0.00, $4, 'unpaid')
         RETURNING *`,
        [
          appInfo.student_id,
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
          appInfo.student_id,
          `Hostel Monthly Fee (${currentMonthYear}) - Seat ${seatInfo.seat_code}`,
          monthlyVal,
          formattedDueDate
        ]
      );
      generatedFees.push(feeIns.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `Application approved! Seat ${seatInfo.seat_code} allocated to ${appInfo.student_name} and fee invoices generated for Cashier clearance.`,
      payload: {
        application: updatedApp.rows[0],
        allocation: allocRes.rows[0],
        fees: generatedFees
      },
      paylod: {
        application: updatedApp.rows[0],
        allocation: allocRes.rows[0],
        fees: generatedFees
      }
    });

  } catch (error) {
    console.error('Error reviewing hostel application:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

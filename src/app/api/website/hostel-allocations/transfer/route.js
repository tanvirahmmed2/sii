import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

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

    const { student_id, to_seat_id, reason } = await request.json();

    if (!student_id || !to_seat_id) {
      return NextResponse.json({
        success: false,
        error: 'Student ID and Target Seat ID are required.'
      }, { status: 400 });
    }

    // Check active allocation
    const activeAllocRes = await query(
      `SELECT ha.*, hs.seat_code AS old_seat_code, h.name AS old_hostel_name 
       FROM hostel_allocations ha
       JOIN hostel_seats hs ON ha.seat_id = hs.id
       JOIN hostel_rooms hr ON hs.room_id = hr.id
       JOIN hostels h ON hr.hostel_id = h.id
       WHERE ha.student_id = $1 AND ha.status = 'active'`,
      [student_id]
    );

    if (activeAllocRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active hostel seat allocation found for this student.'
      }, { status: 404 });
    }

    const currentAlloc = activeAllocRes.rows[0];
    const fromSeatId = currentAlloc.seat_id;

    if (String(fromSeatId) === String(to_seat_id)) {
      return NextResponse.json({
        success: false,
        error: 'Target seat is identical to student’s current seat.'
      }, { status: 400 });
    }

    // Fetch student gender
    const stRes = await query("SELECT gender FROM students WHERE id = $1", [student_id]);
    const studentGender = (stRes.rows[0]?.gender || '').trim();

    // Check target seat availability and hostel gender restriction
    const toSeatCheck = await query(
      `SELECT hs.*, hr.room_number, h.name AS hostel_name, h.gender AS hostel_gender 
       FROM hostel_seats hs
       JOIN hostel_rooms hr ON hs.room_id = hr.id
       JOIN hostels h ON hr.hostel_id = h.id
       WHERE hs.id = $1`,
      [to_seat_id]
    );

    if (toSeatCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Target seat not found.' }, { status: 404 });
    }

    const targetSeat = toSeatCheck.rows[0];
    if (targetSeat.status !== 'available') {
      return NextResponse.json({
        success: false,
        error: `Target seat ${targetSeat.seat_code} is not available (Current status: ${targetSeat.status}).`
      }, { status: 400 });
    }

    // Gender Check Validation
    const targetHostelGender = (targetSeat.hostel_gender || 'Both').trim();

    const sG = studentGender.toLowerCase();
    const hG = targetHostelGender.toLowerCase();

    const isFemaleStudent = sG.includes('female') || sG === 'f' || sG === 'woman';
    const isMaleStudent = !isFemaleStudent && (sG.includes('male') || sG === 'm' || sG === 'man');

    const isMaleHostel = hG === 'male' || (hG.includes('male') && !hG.includes('female'));
    const isFemaleHostel = hG === 'female' || hG.includes('female');

    if (isMaleHostel && !isMaleStudent) {
      return NextResponse.json({
        success: false,
        error: `Gender Mismatch Blocked: Only explicitly Male students can be transferred to ${targetSeat.hostel_name} (${targetHostelGender}-only hall).`
      }, { status: 400 });
    }

    if (isFemaleHostel && !isFemaleStudent) {
      return NextResponse.json({
        success: false,
        error: `Gender Mismatch Blocked: Only explicitly Female students can be transferred to ${targetSeat.hostel_name} (${targetHostelGender}-only hall).`
      }, { status: 400 });
    }

    // 1. Release previous seat
    await query("UPDATE hostel_seats SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [fromSeatId]);
    await query("UPDATE hostel_allocations SET status = 'transferred', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [currentAlloc.id]);

    // 2. Allocate new seat
    await query("UPDATE hostel_seats SET status = 'allocated', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [to_seat_id]);

    const newAllocRes = await query(
      `INSERT INTO hostel_allocations (student_id, seat_id, allocated_at, status, allocated_by_role)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'active', $3)
       RETURNING *`,
      [student_id, to_seat_id, roleLabel]
    );

    // 3. Log Transfer History
    await query(
      `INSERT INTO hostel_transfers (student_id, from_seat_id, to_seat_id, transferred_at, reason, transferred_by)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
      [student_id, fromSeatId, to_seat_id, reason || 'Transferred by staff', roleLabel]
    );

    // 4. Generate Fee Invoice if transfer fee or new monthly fee applies
    const generatedFees = [];
    const oneTimeVal = parseFloat(targetSeat.one_time_fee) || 0;

    if (oneTimeVal > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      const formattedDueDate = dueDate.toISOString().split('T')[0];

      const feeIns = await query(
        `INSERT INTO student_fees (student_id, title, amount, paid_amount, due_date, status)
         VALUES ($1, $2, $3, 0.00, $4, 'unpaid')
         RETURNING *`,
        [
          student_id,
          `Hostel Transfer Fee (${targetSeat.hostel_name} - Seat ${targetSeat.seat_code})`,
          oneTimeVal,
          formattedDueDate
        ]
      );
      generatedFees.push(feeIns.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `Student transferred successfully from Seat ${currentAlloc.old_seat_code} to Seat ${targetSeat.seat_code} in ${targetSeat.hostel_name}.`,
      payload: {
        allocation: newAllocRes.rows[0],
        fees: generatedFees
      },
      paylod: {
        allocation: newAllocRes.rows[0],
        fees: generatedFees
      }
    });

  } catch (error) {
    console.error('Error transferring student hostel seat:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

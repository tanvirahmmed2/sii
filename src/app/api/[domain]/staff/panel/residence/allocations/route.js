import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyResidenceStaffAccess } from 'src/lib/middleware/residence-auth.js';

// GET: List student seat allocations
export async function GET(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const hallId = searchParams.get('hall_id');
    const roomId = searchParams.get('room_id');
    const status = searchParams.get('status') || 'active'; // 'active', 'vacated', 'all'
    const search = searchParams.get('search')?.trim();

    const conditions = ['a.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (hallId) {
      conditions.push(`a.hall_id = $${pIdx++}`);
      values.push(hallId);
    }

    if (roomId) {
      conditions.push(`a.room_id = $${pIdx++}`);
      values.push(roomId);
    }

    if (status && status !== 'all') {
      conditions.push(`a.status = $${pIdx++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(
        `(stu.registration_no ILIKE $${pIdx} OR stu.roll_no ILIKE $${pIdx} OR info.name ILIKE $${pIdx} OR info.email ILIKE $${pIdx} OR info.number ILIKE $${pIdx} OR r.room_number ILIKE $${pIdx} OR h.name ILIKE $${pIdx})`
      );
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const allocationsRes = await queryDb(
      `SELECT a.*,
              h.name AS hall_name, h.code AS hall_code, h.gender AS hall_gender,
              r.room_number, r.floor_number, r.room_type, r.rent_monthly,
              s.seat_number,
              stu.registration_no, stu.roll_no, stu.class_id,
              info.name AS student_name, info.email AS student_email, info.number AS student_number,
              info.gender AS student_gender, info.blood_group,
              cls.name AS class_name,
              p.image_url AS student_photo_url
       FROM website_hall_seat_allocations a
       JOIN website_halls h ON a.hall_id = h.id
       JOIN website_hall_rooms r ON a.room_id = r.id
       JOIN website_hall_room_seats s ON a.seat_id = s.id
       JOIN website_students stu ON a.student_id = stu.id
       LEFT JOIN website_student_info info ON stu.id = info.student_id
       LEFT JOIN website_classes cls ON stu.class_id = cls.id
       LEFT JOIN LATERAL (
         SELECT image_url FROM website_student_pictures
         WHERE student_id = stu.id AND is_primary = TRUE
         LIMIT 1
       ) p ON TRUE
       WHERE ${whereClause}
       ORDER BY a.allocated_date DESC, a.id DESC`,
      values
    );

    // Summary counts
    const statsRes = await queryDb(
      `SELECT
         COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active_allocations,
         COUNT(CASE WHEN status = 'vacated' THEN 1 END)::int AS vacated_allocations,
         COUNT(DISTINCT student_id)::int AS total_students_served
       FROM website_hall_seat_allocations
       WHERE website_id = $1`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      payload: {
        allocations: allocationsRes.rows,
        stats: statsRes.rows[0] || {},
      },
    });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch allocations.' }, { status: 500 });
  }
}

// POST: Allocate a student to a seat
export async function POST(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const staffId = staffSession?.id || staffSession?.staff?.id || null;

    const body = await request.json();
    const {
      seat_id,
      student_id,
      session_id,
      allocated_date = new Date().toISOString().split('T')[0],
      end_date,
      fee_monthly,
      remarks,
    } = body;

    if (!seat_id) {
      return NextResponse.json({ success: false, error: 'Seat is required.' }, { status: 400 });
    }

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'Student is required.' }, { status: 400 });
    }

    // 1. Verify seat exists, belongs to website, and is currently available
    const seatRes = await queryDb(
      `SELECT s.id, s.seat_number, s.status, s.hall_id, s.room_id,
              r.room_number, r.rent_monthly, h.name AS hall_name
       FROM website_hall_room_seats s
       JOIN website_hall_rooms r ON s.room_id = r.id
       JOIN website_halls h ON s.hall_id = h.id
       WHERE s.website_id = $1 AND s.id = $2
       LIMIT 1`,
      [website.id, seat_id]
    );

    if (seatRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Seat not found.' }, { status: 404 });
    }

    const seat = seatRes.rows[0];
    if (seat.status !== 'available') {
      return NextResponse.json(
        { success: false, error: `Seat "${seat.seat_number}" is currently "${seat.status}" and cannot be allocated.` },
        { status: 409 }
      );
    }

    // 2. Verify student exists and belongs to this website
    const stuRes = await queryDb(
      `SELECT s.id, s.registration_no, info.name
       FROM website_students s
       LEFT JOIN website_student_info info ON s.id = info.student_id
       WHERE s.website_id = $1 AND s.id = $2
       LIMIT 1`,
      [website.id, student_id]
    );

    if (stuRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = stuRes.rows[0];

    // 3. Ensure student does NOT already have an active seat allocation
    const existingActive = await queryDb(
      `SELECT a.id, h.name AS hall_name, r.room_number, s.seat_number
       FROM website_hall_seat_allocations a
       JOIN website_halls h ON a.hall_id = h.id
       JOIN website_hall_rooms r ON a.room_id = r.id
       JOIN website_hall_room_seats s ON a.seat_id = s.id
       WHERE a.website_id = $1 AND a.student_id = $2 AND a.status = 'active'
       LIMIT 1`,
      [website.id, student_id]
    );

    if (existingActive.rows.length > 0) {
      const prev = existingActive.rows[0];
      return NextResponse.json(
        {
          success: false,
          error: `Student ${student.name || student.registration_no} already has an active seat: ${prev.hall_name}, Room ${prev.room_number}, Seat ${prev.seat_number}. Please vacate the existing seat before reallocating.`,
        },
        { status: 409 }
      );
    }

    const finalFee = fee_monthly !== undefined ? parseFloat(fee_monthly) : parseFloat(seat.rent_monthly || 0);

    // 4. Insert allocation record
    const insertRes = await queryDb(
      `INSERT INTO website_hall_seat_allocations (
          website_id, hall_id, room_id, seat_id, student_id, session_id,
          allocated_date, end_date, status, fee_monthly, remarks,
          allocated_by_staff_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11)
       RETURNING *`,
      [
        website.id,
        seat.hall_id,
        seat.room_id,
        seat.id,
        student_id,
        session_id || null,
        allocated_date || new Date().toISOString().split('T')[0],
        end_date || null,
        finalFee,
        remarks?.trim() || null,
        staffId,
      ]
    );

    // 5. Update seat status to 'allocated'
    await queryDb(
      `UPDATE website_hall_room_seats
       SET status = 'allocated', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [seat.id]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${seat.seat_number} in Room ${seat.room_number} (${seat.hall_name}) to ${student.name || student.registration_no}.`,
      payload: { allocation: insertRes.rows[0] },
    }, { status: 201 });
  } catch (error) {
    console.error('Error allocating seat:', error);
    return NextResponse.json({ success: false, error: 'Failed to allocate seat.' }, { status: 500 });
  }
}

// PUT: Update allocation details (fees, remarks, dates) OR Vacate/Disallocate seat
export async function PUT(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const staffId = staffSession?.id || staffSession?.staff?.id || null;

    const body = await request.json();
    const {
      id,
      action, // 'vacate' / 'disallocate' OR null for regular edit
      vacated_date = new Date().toISOString().split('T')[0],
      vacate_reason,
      fee_monthly,
      remarks,
      end_date,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Allocation ID is required.' }, { status: 400 });
    }

    const allocRes = await queryDb(
      `SELECT a.*, s.seat_number, r.room_number, h.name AS hall_name
       FROM website_hall_seat_allocations a
       JOIN website_hall_room_seats s ON a.seat_id = s.id
       JOIN website_hall_rooms r ON a.room_id = r.id
       JOIN website_halls h ON a.hall_id = h.id
       WHERE a.website_id = $1 AND a.id = $2
       LIMIT 1`,
      [website.id, id]
    );

    if (allocRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Allocation record not found.' }, { status: 404 });
    }

    const allocation = allocRes.rows[0];

    // Handle Vacate / Disallocate action
    if (action === 'vacate' || action === 'disallocate') {
      if (allocation.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Allocation is already vacated or cancelled.' }, { status: 400 });
      }

      const updateAlloc = await queryDb(
        `UPDATE website_hall_seat_allocations
         SET status = 'vacated',
             vacated_date = $1,
             vacated_by_staff_id = $2,
             vacate_reason = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
          vacated_date || new Date().toISOString().split('T')[0],
          staffId,
          vacate_reason?.trim() || 'Student vacated seat.',
          id,
        ]
      );

      // Free the seat
      await queryDb(
        `UPDATE website_hall_room_seats
         SET status = 'available', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [allocation.seat_id]
      );

      return NextResponse.json({
        success: true,
        message: `Seat ${allocation.seat_number} in Room ${allocation.room_number} has been vacated and is now available.`,
        payload: { allocation: updateAlloc.rows[0] },
      });
    }

    // Standard field update
    const updateRes = await queryDb(
      `UPDATE website_hall_seat_allocations
       SET fee_monthly = COALESCE($1, fee_monthly),
           remarks = COALESCE($2, remarks),
           end_date = COALESCE($3, end_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $4 AND id = $5
       RETURNING *`,
      [
        fee_monthly !== undefined ? parseFloat(fee_monthly) : null,
        remarks !== undefined ? remarks?.trim() || null : null,
        end_date || null,
        website.id,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Allocation details updated successfully.',
      payload: { allocation: updateRes.rows[0] },
    });
  } catch (error) {
    console.error('Error updating allocation:', error);
    return NextResponse.json({ success: false, error: 'Failed to update allocation.' }, { status: 500 });
  }
}

// DELETE: Cancel or hard delete allocation record
export async function DELETE(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Allocation ID is required.' }, { status: 400 });
    }

    const allocRes = await queryDb(
      `SELECT * FROM website_hall_seat_allocations WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, id]
    );

    if (allocRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Allocation record not found.' }, { status: 404 });
    }

    const allocation = allocRes.rows[0];

    // Free the seat if it was active
    if (allocation.status === 'active') {
      await queryDb(
        `UPDATE website_hall_room_seats
         SET status = 'available', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [allocation.seat_id]
      );
    }

    await queryDb(
      `DELETE FROM website_hall_seat_allocations WHERE website_id = $1 AND id = $2`,
      [website.id, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Allocation record deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete allocation.' }, { status: 500 });
  }
}

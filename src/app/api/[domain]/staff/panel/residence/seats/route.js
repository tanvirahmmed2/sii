import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyResidenceStaffAccess } from 'src/lib/middleware/residence-auth.js';

// GET: List seats with allocation details
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
    const status = searchParams.get('status'); // 'available', 'allocated', 'maintenance', 'reserved'

    const conditions = ['s.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (hallId) {
      conditions.push(`s.hall_id = $${pIdx++}`);
      values.push(hallId);
    }

    if (roomId) {
      conditions.push(`s.room_id = $${pIdx++}`);
      values.push(roomId);
    }

    if (status && status !== 'all') {
      conditions.push(`s.status = $${pIdx++}`);
      values.push(status);
    }

    const whereClause = conditions.join(' AND ');

    const seatsRes = await queryDb(
      `SELECT s.*,
              r.room_number, r.floor_number, r.room_type, r.rent_monthly,
              h.name AS hall_name, h.code AS hall_code, h.gender AS hall_gender,
              a.id AS allocation_id, a.student_id, a.allocated_date, a.fee_monthly,
              stu.registration_no, stu.roll_no,
              info.name AS student_name, info.email AS student_email, info.number AS student_number,
              cls.name AS class_name
       FROM website_hall_room_seats s
       JOIN website_hall_rooms r ON s.room_id = r.id
       JOIN website_halls h ON s.hall_id = h.id
       LEFT JOIN website_hall_seat_allocations a ON s.id = a.seat_id AND a.status = 'active'
       LEFT JOIN website_students stu ON a.student_id = stu.id
       LEFT JOIN website_student_info info ON stu.id = info.student_id
       LEFT JOIN website_classes cls ON stu.class_id = cls.id
       WHERE ${whereClause}
       ORDER BY h.name ASC, r.room_number ASC, s.seat_number ASC`,
      values
    );

    return NextResponse.json({
      success: true,
      payload: {
        seats: seatsRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching seats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch seats.' }, { status: 500 });
  }
}

// POST: Add new seat to room
export async function POST(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { room_id, seat_number, status = 'available', is_active = true } = body;

    if (!room_id) {
      return NextResponse.json({ success: false, error: 'Room ID is required.' }, { status: 400 });
    }

    if (!seat_number?.trim()) {
      return NextResponse.json({ success: false, error: 'Seat number is required.' }, { status: 400 });
    }

    const cleanSeatNo = seat_number.trim();

    // Verify room
    const roomRes = await queryDb(
      `SELECT id, hall_id FROM website_hall_rooms WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, room_id]
    );
    if (roomRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    const hallId = roomRes.rows[0].hall_id;

    // Check duplicate seat_number in room
    const dupCheck = await queryDb(
      `SELECT id FROM website_hall_room_seats WHERE room_id = $1 AND LOWER(seat_number) = LOWER($2) LIMIT 1`,
      [room_id, cleanSeatNo]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: `Seat "${cleanSeatNo}" already exists in this room.` }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_hall_room_seats (
          website_id, hall_id, room_id, seat_number, status, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [website.id, hallId, room_id, cleanSeatNo, status || 'available', Boolean(is_active)]
    );

    return NextResponse.json({
      success: true,
      message: 'Seat created successfully.',
      payload: { seat: insertRes.rows[0] },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating seat:', error);
    return NextResponse.json({ success: false, error: 'Failed to create seat.' }, { status: 500 });
  }
}

// PUT: Update seat status
export async function PUT(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, seat_number, status, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Seat ID is required.' }, { status: 400 });
    }

    const seatCheck = await queryDb(
      `SELECT id, room_id, status FROM website_hall_room_seats WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, id]
    );
    if (seatCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Seat not found.' }, { status: 404 });
    }

    // If changing seat status away from 'allocated', verify if there's an active allocation
    if (status && status !== 'allocated' && seatCheck.rows[0].status === 'allocated') {
      const activeAlloc = await queryDb(
        `SELECT id FROM website_hall_seat_allocations WHERE website_id = $1 AND seat_id = $2 AND status = 'active' LIMIT 1`,
        [website.id, id]
      );
      if (activeAlloc.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot change status of an actively allocated seat. Please disallocate/vacate the student first.' },
          { status: 409 }
        );
      }
    }

    const updateRes = await queryDb(
      `UPDATE website_hall_room_seats
       SET seat_number = COALESCE($1, seat_number),
           status = COALESCE($2, status),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $4 AND id = $5
       RETURNING *`,
      [
        seat_number?.trim() || null,
        status || null,
        is_active !== undefined ? Boolean(is_active) : null,
        website.id,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Seat updated successfully.',
      payload: { seat: updateRes.rows[0] },
    });
  } catch (error) {
    console.error('Error updating seat:', error);
    return NextResponse.json({ success: false, error: 'Failed to update seat.' }, { status: 500 });
  }
}

// DELETE: Delete seat
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
      return NextResponse.json({ success: false, error: 'Seat ID is required.' }, { status: 400 });
    }

    const activeAlloc = await queryDb(
      `SELECT id FROM website_hall_seat_allocations WHERE website_id = $1 AND seat_id = $2 AND status = 'active' LIMIT 1`,
      [website.id, id]
    );
    if (activeAlloc.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete actively allocated seat.' }, { status: 409 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_hall_room_seats WHERE website_id = $1 AND id = $2 RETURNING id, seat_number`,
      [website.id, id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Seat not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Seat "${delRes.rows[0].seat_number}" deleted successfully.`,
      payload: { deletedId: delRes.rows[0].id },
    });
  } catch (error) {
    console.error('Error deleting seat:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete seat.' }, { status: 500 });
  }
}

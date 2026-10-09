import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyResidenceStaffAccess } from 'src/lib/middleware/residence-auth.js';

// GET: List rooms for a hall or website with seat metrics
export async function GET(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const hallId = searchParams.get('hall_id');
    const roomId = searchParams.get('id');
    const floor = searchParams.get('floor');
    const roomType = searchParams.get('room_type');
    const search = searchParams.get('search')?.trim();

    if (roomId) {
      const roomRes = await queryDb(
        `SELECT r.*,
                h.name AS hall_name, h.code AS hall_code, h.gender AS hall_gender,
                COUNT(s.id)::int AS total_seats,
                COUNT(CASE WHEN s.status = 'allocated' THEN s.id END)::int AS allocated_seats,
                COUNT(CASE WHEN s.status = 'available' THEN s.id END)::int AS available_seats
         FROM website_hall_rooms r
         JOIN website_halls h ON r.hall_id = h.id
         LEFT JOIN website_hall_room_seats s ON r.id = s.room_id
         WHERE r.website_id = $1 AND r.id = $2
         GROUP BY r.id, h.name, h.code, h.gender`,
        [website.id, roomId]
      );

      if (roomRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
      }

      // Also fetch seats of this room
      const seatsRes = await queryDb(
        `SELECT s.*,
                a.id AS allocation_id, a.student_id, a.allocated_date,
                stu.registration_no AS student_reg, stu.roll_no AS student_roll,
                info.name AS student_name, info.email AS student_email, info.number AS student_number
         FROM website_hall_room_seats s
         LEFT JOIN website_hall_seat_allocations a ON s.id = a.seat_id AND a.status = 'active'
         LEFT JOIN website_students stu ON a.student_id = stu.id
         LEFT JOIN website_student_info info ON stu.id = info.student_id
         WHERE s.room_id = $1
         ORDER BY s.seat_number ASC`,
        [roomId]
      );

      return NextResponse.json({
        success: true,
        payload: {
          room: roomRes.rows[0],
          seats: seatsRes.rows,
        },
      });
    }

    const conditions = ['r.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (hallId) {
      conditions.push(`r.hall_id = $${pIdx++}`);
      values.push(hallId);
    }

    if (floor) {
      conditions.push(`r.floor_number = $${pIdx++}`);
      values.push(parseInt(floor, 10));
    }

    if (roomType && roomType !== 'all') {
      conditions.push(`r.room_type = $${pIdx++}`);
      values.push(roomType);
    }

    if (search) {
      conditions.push(`(r.room_number ILIKE $${pIdx} OR h.name ILIKE $${pIdx})`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const roomsRes = await queryDb(
      `SELECT r.*,
              h.name AS hall_name, h.code AS hall_code, h.gender AS hall_gender,
              COUNT(s.id)::int AS total_seats,
              COUNT(CASE WHEN s.status = 'allocated' THEN s.id END)::int AS allocated_seats,
              COUNT(CASE WHEN s.status = 'available' THEN s.id END)::int AS available_seats
       FROM website_hall_rooms r
       JOIN website_halls h ON r.hall_id = h.id
       LEFT JOIN website_hall_room_seats s ON r.id = s.room_id
       WHERE ${whereClause}
       GROUP BY r.id, h.name, h.code, h.gender
       ORDER BY h.name ASC, r.floor_number ASC, r.room_number ASC`,
      values
    );

    return NextResponse.json({
      success: true,
      payload: {
        rooms: roomsRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch rooms.' }, { status: 500 });
  }
}

// POST: Create room (with optional automated seat generator)
export async function POST(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const {
      hall_id,
      room_number,
      floor_number = 1,
      room_type = 'standard',
      capacity = 4,
      rent_monthly = 0.00,
      description,
      is_active = true,
      auto_generate_seats = true,
    } = body;

    if (!hall_id) {
      return NextResponse.json({ success: false, error: 'Hall is required.' }, { status: 400 });
    }

    if (!room_number?.trim()) {
      return NextResponse.json({ success: false, error: 'Room number is required.' }, { status: 400 });
    }

    const cleanRoomNo = room_number.trim();

    // Verify hall exists and belongs to this website
    const hallRes = await queryDb(
      `SELECT id, name FROM website_halls WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, hall_id]
    );
    if (hallRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected hall not found.' }, { status: 404 });
    }

    // Check duplicate room_number in this hall
    const dupCheck = await queryDb(
      `SELECT id FROM website_hall_rooms WHERE hall_id = $1 AND LOWER(room_number) = LOWER($2) LIMIT 1`,
      [hall_id, cleanRoomNo]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Room "${cleanRoomNo}" already exists in ${hallRes.rows[0].name}.` },
        { status: 409 }
      );
    }

    const numCapacity = Math.max(1, parseInt(capacity, 10) || 4);

    const insertRoom = await queryDb(
      `INSERT INTO website_hall_rooms (
          website_id, hall_id, room_number, floor_number,
          room_type, capacity, rent_monthly, description, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        website.id,
        hall_id,
        cleanRoomNo,
        parseInt(floor_number, 10) || 1,
        room_type || 'standard',
        numCapacity,
        parseFloat(rent_monthly) || 0.00,
        description?.trim() || null,
        Boolean(is_active),
      ]
    );

    const newRoom = insertRoom.rows[0];

    // Auto-generate seats if requested
    if (auto_generate_seats) {
      for (let s = 1; s <= numCapacity; s++) {
        const seatLabel = `Seat-${s}`;
        await queryDb(
          `INSERT INTO website_hall_room_seats (
              website_id, hall_id, room_id, seat_number, status, is_active
           )
           VALUES ($1, $2, $3, $4, 'available', TRUE)
           ON CONFLICT DO NOTHING`,
          [website.id, hall_id, newRoom.id, seatLabel]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Room "${cleanRoomNo}" created successfully with ${auto_generate_seats ? numCapacity : 0} seats.`,
      payload: { room: newRoom },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ success: false, error: 'Failed to create room.' }, { status: 500 });
  }
}

// PUT: Update room
export async function PUT(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const {
      id,
      room_number,
      floor_number,
      room_type,
      capacity,
      rent_monthly,
      description,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Room ID is required.' }, { status: 400 });
    }

    const roomCheck = await queryDb(
      `SELECT id, hall_id, capacity FROM website_hall_rooms WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, id]
    );
    if (roomCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Room record not found.' }, { status: 404 });
    }

    const currentRoom = roomCheck.rows[0];

    if (room_number?.trim()) {
      const dupCheck = await queryDb(
        `SELECT id FROM website_hall_rooms WHERE hall_id = $1 AND LOWER(room_number) = LOWER($2) AND id != $3 LIMIT 1`,
        [currentRoom.hall_id, room_number.trim(), id]
      );
      if (dupCheck.rows.length > 0) {
        return NextResponse.json({ success: false, error: `Room "${room_number.trim()}" already exists in this hall.` }, { status: 409 });
      }
    }

    const updateRes = await queryDb(
      `UPDATE website_hall_rooms
       SET room_number = COALESCE($1, room_number),
           floor_number = COALESCE($2, floor_number),
           room_type = COALESCE($3, room_type),
           capacity = COALESCE($4, capacity),
           rent_monthly = COALESCE($5, rent_monthly),
           description = COALESCE($6, description),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $8 AND id = $9
       RETURNING *`,
      [
        room_number?.trim() || null,
        floor_number !== undefined ? parseInt(floor_number, 10) : null,
        room_type || null,
        capacity !== undefined ? parseInt(capacity, 10) : null,
        rent_monthly !== undefined ? parseFloat(rent_monthly) : null,
        description !== undefined ? description?.trim() || null : null,
        is_active !== undefined ? Boolean(is_active) : null,
        website.id,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Room updated successfully.',
      payload: { room: updateRes.rows[0] },
    });
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ success: false, error: 'Failed to update room.' }, { status: 500 });
  }
}

// DELETE: Delete room
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
      return NextResponse.json({ success: false, error: 'Room ID is required.' }, { status: 400 });
    }

    // Check active allocations in this room
    const activeAlloc = await queryDb(
      `SELECT id FROM website_hall_seat_allocations WHERE website_id = $1 AND room_id = $2 AND status = 'active' LIMIT 1`,
      [website.id, id]
    );
    if (activeAlloc.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete room with active seat allocations. Please vacate resident students first.' },
        { status: 409 }
      );
    }

    const delRes = await queryDb(
      `DELETE FROM website_hall_rooms WHERE website_id = $1 AND id = $2 RETURNING id, room_number`,
      [website.id, id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Room "${delRes.rows[0].room_number}" deleted successfully.`,
      payload: { deletedId: delRes.rows[0].id },
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete room.' }, { status: 500 });
  }
}

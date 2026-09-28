import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// GET all rooms, optionally filter by hostel_id
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get('hostel_id');

    let dbQuery = `
      SELECT hr.id, hr.hostel_id, hr.floor, hr.room_number, hr.room_type, hr.capacity, hr.availability_status, hr.created_at, 
             h.name as hostel_name, h.gender as hostel_gender,
             COUNT(hs.id) AS total_seats,
             COUNT(CASE WHEN hs.status = 'allocated' THEN 1 END) AS allocated_seats
      FROM hostel_rooms hr
      JOIN hostels h ON hr.hostel_id = h.id
      LEFT JOIN hostel_seats hs ON hr.id = hs.room_id
    `;
    const params = [];

    if (hostelId) {
      dbQuery += ' WHERE hr.hostel_id = $1';
      params.push(hostelId);
    }

    dbQuery += ' GROUP BY hr.id, h.name, h.gender ORDER BY h.name ASC, hr.floor ASC, hr.room_number ASC';

    const result = await query(dbQuery, params);
    const res_data = { rooms: result.rows };

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched hostel rooms',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching hostel rooms:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve rooms.',
      error: error.message
    }, { status: 500 });
  }
}

// POST create a room
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins and Registrars only.',
        error: 'Unauthorized'
      }, { status: 403 });
    }

    const { hostel_id, floor, room_number, room_type, capacity, availability_status, one_time_fee, monthly_fee } = await request.json();

    if (!hostel_id || !room_number || !room_type || !capacity) {
      return NextResponse.json({
        success: false,
        message: 'Hostel ID, room number, type, and capacity are required.',
        error: 'Bad Request'
      }, { status: 400 });
    }

    const roomNum = room_number.trim();
    const floorVal = parseInt(floor, 10) || 1;

    // Check duplicate room number in same hostel
    const check = await query(
      'SELECT id FROM hostel_rooms WHERE hostel_id = $1 AND room_number = $2',
      [hostel_id, roomNum]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A room with this number already exists in this hostel.',
        error: 'Conflict'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO hostel_rooms (hostel_id, floor, room_number, room_type, capacity, availability_status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, hostel_id, floor, room_number, room_type, capacity, availability_status`,
      [
        hostel_id,
        floorVal,
        roomNum,
        room_type.trim(),
        parseInt(capacity, 10),
        availability_status || 'Available'
      ]
    );

    const room = result.rows[0];
    const cap = parseInt(capacity, 10) || 1;
    const oneTimeVal = parseFloat(one_time_fee) || 0;
    const monthlyVal = parseFloat(monthly_fee) || 0;

    // Auto-generate seats e.g. 101A, 101B, 101C...
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const generatedSeats = [];

    for (let i = 0; i < cap; i++) {
      const suffix = letters[i] || `-${i + 1}`;
      const seatCode = `${roomNum}${suffix}`;

      const seatIns = await query(
        `INSERT INTO hostel_seats (room_id, seat_code, one_time_fee, monthly_fee, status)
         VALUES ($1, $2, $3, $4, 'available')
         ON CONFLICT (room_id, seat_code) DO NOTHING
         RETURNING *`,
        [room.id, seatCode, oneTimeVal, monthlyVal]
      );
      if (seatIns.rows.length > 0) {
        generatedSeats.push(seatIns.rows[0]);
      }
    }

    const res_data = {
      message: 'Hostel room and seats created successfully.',
      room,
      seats: generatedSeats
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hostel room:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create hostel room.',
      error: error.message
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// GET all seats (optionally filtered by room_id or hostel_id)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id');
    const hostelId = searchParams.get('hostel_id');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        hs.id,
        hs.room_id,
        hs.seat_code,
        hs.one_time_fee,
        hs.monthly_fee,
        hs.status,
        hs.created_at,
        hr.room_number,
        hr.floor,
        hr.room_type,
        hr.hostel_id,
        h.name AS hostel_name,
        h.gender AS hostel_gender,
        ha.id AS allocation_id,
        ha.student_id,
        s.name AS student_name,
        s.registration_number AS student_reg
      FROM hostel_seats hs
      JOIN hostel_rooms hr ON hs.room_id = hr.id
      JOIN hostels h ON hr.hostel_id = h.id
      LEFT JOIN hostel_allocations ha ON hs.id = ha.seat_id AND ha.status = 'active'
      LEFT JOIN students s ON ha.student_id = s.id
    `;
    let params = [];
    let conditions = [];

    if (roomId) {
      params.push(roomId);
      conditions.push(`hs.room_id = $${params.length}`);
    }

    if (hostelId) {
      params.push(hostelId);
      conditions.push(`hr.hostel_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`hs.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY hr.floor ASC, hr.room_number ASC, hs.seat_code ASC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched hostel seats',
      payload: { seats: result.rows },
      paylod: { seats: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching hostel seats:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve seats.',
      error: error.message
    }, { status: 500 });
  }
}

// POST create new room seat(s)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Admins and Registrars only.'
      }, { status: 403 });
    }

    const body = await request.json();
    const { room_id, seat_code, seat_codes, one_time_fee, monthly_fee } = body;

    if (!room_id) {
      return NextResponse.json({
        success: false,
        error: 'Room ID is required.'
      }, { status: 400 });
    }

    const roomCheck = await query('SELECT id, room_number FROM hostel_rooms WHERE id = $1', [room_id]);
    if (roomCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Hostel room not found.'
      }, { status: 404 });
    }

    const codesToCreate = Array.isArray(seat_codes) && seat_codes.length > 0 
      ? seat_codes 
      : seat_code 
      ? [seat_code] 
      : [];

    if (codesToCreate.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one seat code (e.g. 101A) is required.'
      }, { status: 400 });
    }

    const insertedSeats = [];
    const oneTimeVal = parseFloat(one_time_fee) || 0;
    const monthlyVal = parseFloat(monthly_fee) || 0;

    for (const rawCode of codesToCreate) {
      const code = String(rawCode).trim().toUpperCase();
      if (!code) continue;

      const dupCheck = await query('SELECT id FROM hostel_seats WHERE room_id = $1 AND seat_code = $2', [room_id, code]);
      if (dupCheck.rows.length > 0) continue;

      const insRes = await query(
        `INSERT INTO hostel_seats (room_id, seat_code, one_time_fee, monthly_fee, status)
         VALUES ($1, $2, $3, $4, 'available')
         RETURNING *`,
        [room_id, code, oneTimeVal, monthlyVal]
      );
      insertedSeats.push(insRes.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${insertedSeats.length} seat(s).`,
      payload: { seats: insertedSeats },
      paylod: { seats: insertedSeats }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hostel seats:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

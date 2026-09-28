import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update a room
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { hostel_id, room_number, room_type, capacity, availability_status } = await request.json();

    if (!hostel_id || !room_number || !room_type || !capacity) {
      return NextResponse.json({
        success: false,
        message: 'Hostel ID, room number, type, and capacity are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate room number in same hostel (excluding current ID)
    const duplicate = await query(
      'SELECT id FROM hostel_rooms WHERE hostel_id = $1 AND room_number = $2 AND id <> $3',
      [hostel_id, room_number.trim(), id]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Another room with this number already exists in this hostel.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `UPDATE hostel_rooms 
       SET hostel_id = $1, room_number = $2, room_type = $3, capacity = $4, availability_status = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 
       RETURNING id, hostel_id, room_number, room_type, capacity, availability_status`,
      [
        hostel_id,
        room_number.trim(),
        room_type.trim(),
        parseInt(capacity, 10),
        availability_status || 'Available',
        id
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Hostel room not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Hostel room details updated successfully.',
      room: result.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating hostel room:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update hostel room. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a room
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const result = await query('DELETE FROM hostel_rooms WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Room not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = { message: 'Room deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete room. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

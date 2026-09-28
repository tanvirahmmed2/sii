import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// GET the broadcast announcement (latest entry)
export async function GET() {
  try {
    const result = await query(
      'SELECT id, name, description, expires_at, location, created_at, updated_at FROM announcements ORDER BY id DESC LIMIT 1'
    );
    const res_data = { announcement: result.rows[0] || null };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched announcement',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create or replace the single broadcast announcement
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { name, description, expires_at, location } = await request.json();

    if (!name || !description || !expires_at) {
      return NextResponse.json({
        success: false,
        message: 'Announcement name, description, and expires_at are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Replace any existing announcement to ensure clean state
    await query('DELETE FROM announcements');

    const result = await query(
      `INSERT INTO announcements (name, description, expires_at, location)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, expires_at, location, created_at, updated_at`,
      [
        name.trim(),
        description.trim(),
        expires_at,
        location ? location.trim() : null
      ]
    );

    const res_data = {
      message: 'Announcement published successfully.',
      announcement: result.rows[0]
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to publish announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update or create the single broadcast announcement
export async function PUT(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { name, description, expires_at, location } = await request.json();

    if (!name || !description || !expires_at) {
      return NextResponse.json({
        success: false,
        message: 'Announcement name, description, and expires_at are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check if there is an announcement to update
    const checkExist = await query('SELECT id FROM announcements ORDER BY id DESC LIMIT 1');
    
    let result;
    if (checkExist.rows.length === 0) {
      result = await query(
        `INSERT INTO announcements (name, description, expires_at, location)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, expires_at, location, created_at, updated_at`,
        [
          name.trim(),
          description.trim(),
          expires_at,
          location ? location.trim() : null
        ]
      );
    } else {
      const announcementId = checkExist.rows[0].id;
      result = await query(
        `UPDATE announcements
         SET name = $1, description = $2, expires_at = $3, location = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, name, description, expires_at, location, created_at, updated_at`,
        [
          name.trim(),
          description.trim(),
          expires_at,
          location ? location.trim() : null,
          announcementId
        ]
      );
    }

    const res_data = {
      message: 'Announcement updated successfully.',
      announcement: result.rows[0]
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE the active announcement
export async function DELETE() {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    await query('DELETE FROM announcements');

    const res_data = { message: 'Announcement deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

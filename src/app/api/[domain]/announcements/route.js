import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin, isRegister } from 'src/lib/middleware/auth';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET the broadcast announcement (latest entry)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({
        success: false,
        message: 'Tenant website not found',
        error: 'Not Found',
        paylod: null,
      }, { status: 404 });
    }

    const result = await query(
      `SELECT id, website_id, name, description, expires_at, location, created_at, updated_at 
       FROM website_announcements 
       WHERE website_id = $1 
       ORDER BY id DESC LIMIT 1`,
      [website.id]
    );

    const announcement = result.rows[0] || null;
    const res_data = { announcement };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched announcement',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

// POST create or replace the single broadcast announcement
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

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

    // Replace any existing announcement for this website
    await query('DELETE FROM website_announcements WHERE website_id = $1', [website.id]);

    const result = await query(
      `INSERT INTO website_announcements (website_id, name, description, expires_at, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, website_id, name, description, expires_at, location, created_at, updated_at`,
      [
        website.id,
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
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to publish announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

// PUT update or create the single broadcast announcement
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

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

    const checkExist = await query(
      'SELECT id FROM website_announcements WHERE website_id = $1 ORDER BY id DESC LIMIT 1',
      [website.id]
    );
    
    let result;
    if (checkExist.rows.length === 0) {
      result = await query(
        `INSERT INTO website_announcements (website_id, name, description, expires_at, location)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, website_id, name, description, expires_at, location, created_at, updated_at`,
        [
          website.id,
          name.trim(),
          description.trim(),
          expires_at,
          location ? location.trim() : null
        ]
      );
    } else {
      const announcementId = checkExist.rows[0].id;
      result = await query(
        `UPDATE website_announcements
         SET name = $1, description = $2, expires_at = $3, location = $4, updated_at = CURRENT_TIMESTAMP
         WHERE website_id = $5 AND id = $6
         RETURNING id, website_id, name, description, expires_at, location, created_at, updated_at`,
        [
          name.trim(),
          description.trim(),
          expires_at,
          location ? location.trim() : null,
          website.id,
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
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

// DELETE the active announcement
export async function DELETE(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    await query('DELETE FROM website_announcements WHERE website_id = $1', [website.id]);

    const res_data = { message: 'Announcement deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete announcement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

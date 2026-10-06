import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/developer';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET single history by ID
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const params = await context?.params;
    const id = params?.id;

    const result = await query(
      'SELECT * FROM website_histories WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'History record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched history record',
      payload: { history: result.rows[0] },
      paylod: { history: result.rows[0] },
      history: result.rows[0]
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching history record:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve history record.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update history by ID (Admin only)
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access. Only admins can update history.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;
    const body = await request.json();
    const { title, description, date, infor } = body;

    if (!title || !title.trim() || !description || !description.trim() || !date) {
      return NextResponse.json({
        success: false,
        message: 'Title, description, and date are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({
        success: false,
        message: 'Invalid date provided.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `UPDATE website_histories
       SET title = $1, description = $2, date = $3, infor = $4, updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $5 AND id = $6
       RETURNING *`,
      [title.trim(), description.trim(), parsedDate.toISOString(), infor ? infor.trim() : null, website.id, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'History record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'History record updated successfully.',
      payload: { history: result.rows[0] },
      paylod: { history: result.rows[0] },
      history: result.rows[0]
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating history record:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update history record.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE history by ID (Admin only)
export async function DELETE(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access. Only admins can delete history.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;
    const result = await query(
      'DELETE FROM website_histories WHERE website_id = $1 AND id = $2 RETURNING *',
      [website.id, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'History record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'History record deleted successfully.',
      payload: { history: result.rows[0] },
      paylod: { history: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting history record:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete history record.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

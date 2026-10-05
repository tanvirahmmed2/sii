import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/auth';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all histories (Public) - Scoped to tenant
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { histories: [] } }, { status: 404 });
    }

    const result = await query(
      'SELECT * FROM website_histories WHERE website_id = $1 ORDER BY date DESC, id DESC',
      [website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched histories',
      payload: { histories: result.rows },
      paylod: { histories: result.rows },
      histories: result.rows
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching histories:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve histories. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create history (Admin only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access. Only admins can create history.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

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
      `INSERT INTO website_histories (website_id, title, description, date, infor)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [website.id, title.trim(), description.trim(), parsedDate.toISOString(), infor ? infor.trim() : null]
    );

    return NextResponse.json({
      success: true,
      message: 'History record created successfully.',
      payload: { history: result.rows[0] },
      paylod: { history: result.rows[0] },
      history: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating history:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create history record. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

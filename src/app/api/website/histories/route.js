import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all histories (Public) - Newest at top, oldest at the bottom
export async function GET() {
  try {
    const result = await query('SELECT * FROM histories ORDER BY date DESC, id DESC');
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched histories',
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
export async function POST(request) {
  try {
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
      `INSERT INTO histories (title, description, date, infor)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), description.trim(), parsedDate.toISOString(), infor ? infor.trim() : null]
    );

    return NextResponse.json({
      success: true,
      message: 'History record created successfully.',
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

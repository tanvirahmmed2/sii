import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET single history by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const result = await query('SELECT * FROM histories WHERE id = $1', [id]);
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
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access. Only admins can update history.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
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
      `UPDATE histories
       SET title = $1, description = $2, date = $3, infor = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title.trim(), description.trim(), parsedDate.toISOString(), infor ? infor.trim() : null, id]
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
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access. Only admins can delete history.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const result = await query('DELETE FROM histories WHERE id = $1 RETURNING *', [id]);

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

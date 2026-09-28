import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

export async function PUT(request, { params }) {
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

    const { id } = await params;
    const { status } = await request.json();

    if (!status || (status !== 'on' && status !== 'off')) {
      return NextResponse.json({
        success: false,
        message: "Status must be either 'on' or 'off'.",
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const updateResult = await query(
      `UPDATE days SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Day not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Day status updated successfully',
      paylod: { day: updateResult.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating day status:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update day status.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

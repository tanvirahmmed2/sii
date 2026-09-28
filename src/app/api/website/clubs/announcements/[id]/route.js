import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// PUT update club announcement
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins and registrars only.'
      }, { status: 403 });
    }

    const { id } = await params;
    const { club_id, title, content, is_important, expires_at } = await request.json();

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        message: 'Title and content are required.'
      }, { status: 400 });
    }

    const checkExist = await query(`SELECT id FROM club_announcements WHERE id = $1`, [id]);
    if (checkExist.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club announcement not found.'
      }, { status: 404 });
    }

    let updateSql = `
      UPDATE club_announcements 
      SET title = $1, content = $2, is_important = $3, expires_at = $4
    `;
    const updateParams = [title, content, Boolean(is_important), expires_at || null];

    if (club_id) {
      updateSql += `, club_id = $5 WHERE id = $6 RETURNING *`;
      updateParams.push(club_id, id);
    } else {
      updateSql += ` WHERE id = $5 RETURNING *`;
      updateParams.push(id);
    }

    const result = await query(updateSql, updateParams);
    const payload = { announcement: result.rows[0] };

    return NextResponse.json({
      success: true,
      message: 'Club announcement updated successfully',
      paylod: payload,
      payload: payload
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating club announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update club announcement',
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

// DELETE club announcement
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins and registrars only.'
      }, { status: 403 });
    }

    const { id } = await params;
    const checkExist = await query(`SELECT id FROM club_announcements WHERE id = $1`, [id]);
    if (checkExist.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club announcement not found.'
      }, { status: 404 });
    }

    await query(`DELETE FROM club_announcements WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Club announcement deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting club announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete club announcement',
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

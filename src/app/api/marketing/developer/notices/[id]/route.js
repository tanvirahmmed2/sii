import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const res = await queryDb(`
      SELECT n.*, d.name AS creator_name, d.email AS creator_email
      FROM notices n
      LEFT JOIN developers d ON n.created_by_developer_id = d.id
      WHERE n.id = $1
    `, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, notice: res.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const allowedKeys = ['title', 'content', 'priority', 'category', 'is_pinned', 'target_role', 'expires_at'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        fields.push(`"${key}" = $${idx++}`);
        if (key === 'expires_at') {
          values.push(body[key] ? new Date(body[key]) : null);
        } else if (key === 'is_pinned') {
          values.push(Boolean(body[key]));
        } else {
          values.push(body[key]);
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update.' }, { status: 400 });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const res = await queryDb(
      `UPDATE notices SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      notice: res.rows[0],
      message: 'Notice updated successfully.',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 403 });
    }

    const { id } = await params;
    await queryDb('DELETE FROM notices WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

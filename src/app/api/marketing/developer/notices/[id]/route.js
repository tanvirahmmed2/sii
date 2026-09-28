import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// PUT: Update notice or toggle pin
// ============================================================================
export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission notices required to edit notices.' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, priority, category, is_pinned, target_role, expires_at } = body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title.trim());
    }
    if (content !== undefined) {
      fields.push(`content = $${idx++}`);
      values.push(content.trim());
    }
    if (priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(priority);
    }
    if (category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(category);
    }
    if (is_pinned !== undefined) {
      fields.push(`is_pinned = $${idx++}`);
      values.push(Boolean(is_pinned));
    }
    if (target_role !== undefined) {
      fields.push(`target_role = $${idx++}`);
      values.push(target_role);
    }
    if (expires_at !== undefined) {
      fields.push(`expires_at = $${idx++}`);
      values.push(expires_at ? new Date(expires_at) : null);
    }

    if (fields.length > 0) {
      values.push(id);
      await queryDb(`UPDATE notices SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }

    return NextResponse.json({ success: true, message: 'Notice updated successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete notice
// ============================================================================
export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission notices required to delete notices.' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;
    await queryDb('DELETE FROM notices WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// PATCH: Update candidate application status and reviewer notes
// ============================================================================
export async function PATCH(request, context) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Careers permission required.' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, reviewer_notes } = body;

    const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'HIRED'];

    const updates = [];
    const params = [];

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if (reviewer_notes !== undefined) {
      params.push(reviewer_notes);
      updates.push(`reviewer_notes = $${params.length}`);
    }

    const reviewerId = auth.staff?.id || null;
    params.push(reviewerId);
    updates.push(`reviewed_by_developer_id = $${params.length}`);
    updates.push(`reviewed_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    const query = `
      UPDATE career_application
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `;

    const res = await queryDb(query, params);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Candidate application not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate application updated successfully.',
      application: res.rows[0],
    });
  } catch (error) {
    console.error('Developer career application PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete a candidate application
// ============================================================================
export async function DELETE(request, context) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden.' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await context.params;

    const res = await queryDb(
      `DELETE FROM career_application WHERE id = $1 RETURNING id, applicant_name`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Candidate application not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Application from "${res.rows[0].applicant_name}" removed.`,
    });
  } catch (error) {
    console.error('Developer career application DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

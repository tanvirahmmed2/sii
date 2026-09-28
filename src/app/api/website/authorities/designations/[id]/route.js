import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET designation by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query('SELECT * FROM authority_designations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Designation not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully retrieved designation details',
      paylod: { designation: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching designation details:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve designation. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update designation (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { title, slug, description, is_head = false } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Title is required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const slugify = (text) =>
      String(text || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

    const finalSlug = slug ? slugify(slug) : slugify(title);

    const result = await query(
      `UPDATE authority_designations 
       SET title = $1, slug = $2, description = $3, is_head = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [title.trim(), finalSlug, description ? description.trim() : null, Boolean(is_head), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Designation not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Designation updated successfully.',
      paylod: { designation: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating designation:', error);
    if (error.code === '23505') {
      return NextResponse.json({
        success: false,
        message: 'Designation title or slug already exists.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      message: 'Failed to update designation. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE designation (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query('DELETE FROM authority_designations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Designation not found or already deleted.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Designation deleted successfully.',
      paylod: { id: result.rows[0].id }
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting designation:', error);
    if (error.code === '23503') {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete designation because it is currently assigned to authority members.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      message: 'Failed to delete designation. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

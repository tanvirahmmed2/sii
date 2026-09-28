import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all designations
export async function GET() {
  try {
    const result = await query('SELECT * FROM authority_designations ORDER BY id ASC');
    const res_data = { designations: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched designations',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching designations:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve designations. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// POST create designation (Admin only)
export async function POST(request) {
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

    const { title, slug, description, is_head = false } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Title is required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const finalSlug = slug ? slugify(slug) : slugify(title);

    const result = await query(
      `INSERT INTO authority_designations (title, slug, description, is_head) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [title.trim(), finalSlug, description ? description.trim() : null, Boolean(is_head)]
    );

    return NextResponse.json({
      success: true,
      message: 'Designation created successfully.',
      paylod: { designation: result.rows[0] }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating designation:', error);
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
      message: 'Failed to create designation. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

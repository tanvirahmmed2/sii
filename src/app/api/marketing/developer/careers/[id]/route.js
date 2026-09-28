import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

function generateSlug(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// GET: Fetch single career by ID
// ============================================================================
export async function GET(request, context) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Unauthorized.' },
        { status: auth.status || 401 }
      );
    }

    const { id } = await context.params;

    const res = await queryDb(
      `
      SELECT 
        c.*,
        d.name AS creator_name,
        d.email AS creator_email,
        COUNT(ca.id)::int AS total_applications
      FROM career c
      LEFT JOIN developers d ON c.created_by_developer_id = d.id
      LEFT JOIN career_application ca ON c.id = ca.career_id
      WHERE c.id = $1
      GROUP BY c.id, d.name, d.email
      LIMIT 1
      `,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job posting not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      career: res.rows[0],
    });
  } catch (error) {
    console.error('Developer career GET by ID error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update single career by ID
// ============================================================================
export async function PUT(request, context) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden.' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const existingRes = await queryDb(`SELECT id, slug FROM career WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job posting not found.' },
        { status: 404 }
      );
    }

    const currentJob = existingRes.rows[0];

    const {
      title,
      slug,
      department,
      job_type = 'FULL_TIME',
      workplace_type = 'REMOTE',
      location = 'Remote',
      experience_level = 'MID_LEVEL',
      salary_range = '',
      description,
      requirements = '',
      responsibilities = '',
      benefits = '',
      deadline = null,
      is_published = true,
      is_featured = false,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job title is required.' },
        { status: 400 }
      );
    }

    if (!department || !department.trim()) {
      return NextResponse.json(
        { success: false, error: 'Department is required.' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job description is required.' },
        { status: 400 }
      );
    }

    // Slug check if changed
    let finalSlug = currentJob.slug;
    if (slug && slug.trim() && generateSlug(slug) !== currentJob.slug) {
      const baseSlug = generateSlug(slug);
      finalSlug = baseSlug;
      let counter = 1;
      while (true) {
        const slugCheck = await queryDb(
          `SELECT id FROM career WHERE slug = $1 AND id != $2 LIMIT 1`,
          [finalSlug, id]
        );
        if (slugCheck.rows.length === 0) break;
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const updateRes = await queryDb(
      `
      UPDATE career
      SET 
        title = $1,
        slug = $2,
        department = $3,
        job_type = $4,
        workplace_type = $5,
        location = $6,
        experience_level = $7,
        salary_range = $8,
        description = $9,
        requirements = $10,
        responsibilities = $11,
        benefits = $12,
        deadline = $13,
        is_published = $14,
        is_featured = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
      `,
      [
        title.trim(),
        finalSlug,
        department.trim(),
        job_type,
        workplace_type,
        location.trim() || 'Remote',
        experience_level,
        salary_range?.trim() || null,
        description.trim(),
        requirements?.trim() || null,
        responsibilities?.trim() || null,
        benefits?.trim() || null,
        deadline ? new Date(deadline) : null,
        Boolean(is_published),
        Boolean(is_featured),
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Job posting updated successfully!',
      career: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Developer career PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Remove single career by ID
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

    const deleteRes = await queryDb(
      `DELETE FROM career WHERE id = $1 RETURNING id, title`,
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job posting not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Job posting "${deleteRes.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Developer career DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

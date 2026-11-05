import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

function generateFeatureKey(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await queryDb(
        `SELECT cm.id, cm.name, cm.slug AS key, cm.slug, cm.path, cm.category, cm.description, cm.icon, cm.is_active,
                COUNT(pcm.package_id)::int AS packages_count,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'package_id', p.id,
                      'package_name', p.name
                    )
                  ) FILTER (WHERE p.id IS NOT NULL),
                  '[]'::json
                ) AS packages
         FROM website_control_modules cm
         LEFT JOIN package_control_modules pcm ON cm.id = pcm.control_module_id
         LEFT JOIN packages p ON pcm.package_id = p.id
         WHERE cm.id = $1
         GROUP BY cm.id
         LIMIT 1`,
        [Number(id)]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb(
      `SELECT cm.id, cm.name, cm.slug AS key, cm.slug, cm.path, cm.category, cm.description, cm.icon, cm.is_active,
              COUNT(pcm.package_id)::int AS packages_count
       FROM website_control_modules cm
       LEFT JOIN package_control_modules pcm ON cm.id = pcm.control_module_id
       GROUP BY cm.id
       ORDER BY cm.category ASC, cm.display_order ASC, cm.id ASC`
    );

    return NextResponse.json({ success: true, table: 'website_control_modules', records: res.rows });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'features');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const data = body.data || body;
    const name = (data.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Feature name is required' }, { status: 400 });
    }

    let slug = generateFeatureKey(data.key || data.slug || name);
    if (!slug) slug = `feat-${Date.now()}`;

    // Ensure unique slug
    const keyCheck = await queryDb('SELECT id FROM website_control_modules WHERE LOWER(slug) = LOWER($1) LIMIT 1', [slug]);
    if (keyCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const description = data.description || '';
    const icon = data.icon || 'BiCube';
    const category = data.category || 'General Management';
    const path = data.path || `/staff-panel/${slug}`;

    const res = await queryDb(
      `INSERT INTO website_control_modules (name, slug, path, category, description, icon, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, name, slug AS key, slug, path, category, description, icon, is_active`,
      [name, slug, path, category, description, icon]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Feature created successfully',
        record: res.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing feature POST request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'features');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || body.id || body.featureId || body.data?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Feature ID is required' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM website_control_modules WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const data = body.data || body;
    const name = data.name !== undefined ? (data.name || '').trim() : current.name;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Feature name cannot be empty' }, { status: 400 });
    }

    let slug = data.key !== undefined || data.slug !== undefined ? generateFeatureKey(data.key || data.slug) : current.slug;
    if (!slug) {
      slug = generateFeatureKey(name) || `feat-${Date.now()}`;
    }

    const keyConflict = await queryDb('SELECT id FROM website_control_modules WHERE LOWER(slug) = LOWER($1) AND id != $2 LIMIT 1', [slug, Number(id)]);
    if (keyConflict.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Feature slug/key "${slug}" is already in use by another feature.` },
        { status: 400 }
      );
    }

    const description = data.description !== undefined ? data.description : current.description;
    const icon = data.icon !== undefined ? data.icon : current.icon;
    const category = data.category !== undefined ? data.category : current.category;
    const path = data.path !== undefined ? data.path : current.path;

    const res = await queryDb(
      `UPDATE website_control_modules
       SET name = $1, slug = $2, path = $3, category = $4, description = $5, icon = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, slug AS key, slug, path, category, description, icon, is_active`,
      [name, slug, path, category, description, icon, Number(id)]
    );

    return NextResponse.json({
      success: true,
      message: 'Feature updated successfully',
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating feature PUT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'features');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('featureId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.featureId;
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Feature ID is required' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM website_control_modules WHERE id = $1 RETURNING id, name, slug AS key, slug', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Feature not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Feature deleted successfully',
      deleted: res.rows[0],
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

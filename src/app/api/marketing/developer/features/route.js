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
        `SELECT tm.id, tm.name, tm.slug AS key, tm.slug, tm.description, tm.icon, tm.is_active,
                COUNT(pm.package_id)::int AS packages_count,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'package_id', p.id,
                      'package_name', p.name
                    )
                  ) FILTER (WHERE p.id IS NOT NULL),
                  '[]'::json
                ) AS packages
         FROM tenant_modules tm
         LEFT JOIN package_modules pm ON tm.id = pm.tenant_module_id
         LEFT JOIN packages p ON pm.package_id = p.id
         WHERE tm.id = $1
         GROUP BY tm.id
         LIMIT 1`,
        [Number(id)]
      ).catch(async () => {
        // Fallback to legacy feature table if tenant_modules query fails
        return await queryDb('SELECT id, name, key, description FROM feature WHERE id = $1', [Number(id)]).catch(() => ({ rows: [] }));
      });

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb(
      `SELECT tm.id, tm.name, tm.slug AS key, tm.slug, tm.description, tm.icon, tm.is_active,
              COUNT(pm.package_id)::int AS packages_count
       FROM tenant_modules tm
       LEFT JOIN package_modules pm ON tm.id = pm.tenant_module_id
       GROUP BY tm.id
       ORDER BY tm.id ASC`
    ).catch(async () => {
      // Fallback to legacy feature table if tenant_modules query fails
      return await queryDb('SELECT id, name, key, description FROM feature ORDER BY id ASC').catch(() => ({ rows: [] }));
    });

    return NextResponse.json({ success: true, table: 'tenant_modules', records: res.rows });
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
    const keyCheck = await queryDb('SELECT id FROM tenant_modules WHERE LOWER(slug) = LOWER($1) LIMIT 1', [slug]);
    if (keyCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const description = data.description || '';
    const icon = data.icon || 'BiCube';

    const res = await queryDb(
      `INSERT INTO tenant_modules (name, slug, description, icon, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, name, slug AS key, slug, description, icon, is_active`,
      [name, slug, description, icon]
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

    const existingRes = await queryDb('SELECT * FROM tenant_modules WHERE id = $1', [Number(id)]);
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

    const keyConflict = await queryDb('SELECT id FROM tenant_modules WHERE LOWER(slug) = LOWER($1) AND id != $2 LIMIT 1', [slug, Number(id)]);
    if (keyConflict.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Feature slug/key "${slug}" is already in use by another feature.` },
        { status: 400 }
      );
    }

    const description = data.description !== undefined ? data.description : current.description;
    const icon = data.icon !== undefined ? data.icon : current.icon;

    const res = await queryDb(
      `UPDATE tenant_modules
       SET name = $1, slug = $2, description = $3, icon = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, slug AS key, slug, description, icon, is_active`,
      [name, slug, description, icon, Number(id)]
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

    const res = await queryDb('DELETE FROM tenant_modules WHERE id = $1 RETURNING id, name, slug AS key, slug', [Number(id)]);
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

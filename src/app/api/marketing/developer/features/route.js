import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

function generateFeatureKey(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await queryDb(
        `SELECT f.*,
                COUNT(pf.package_id)::int AS packages_count,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'package_id', p.id,
                      'package_name', p.name,
                      'value', pf.value,
                      'is_enabled', pf.is_enabled
                    )
                  ) FILTER (WHERE p.id IS NOT NULL),
                  '[]'::json
                ) AS packages
         FROM feature f
         LEFT JOIN packages_feature pf ON f.id = pf.feature_id
         LEFT JOIN packages p ON pf.package_id = p.id
         WHERE f.id = $1
         GROUP BY f.id
         LIMIT 1`,
        [Number(id)]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb(
      `SELECT f.*,
              COUNT(pf.package_id)::int AS packages_count
       FROM feature f
       LEFT JOIN packages_feature pf ON f.id = pf.feature_id
       GROUP BY f.id
       ORDER BY f.id ASC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, table: 'feature', records: res.rows });
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
    // CREATE FEATURE
    const data = body.data || body;
    const name = (data.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Feature name is required' }, { status: 400 });
    }

    let key = generateFeatureKey(data.key || name);
    if (!key) key = `feat_${Date.now()}`;

    // Ensure unique key
    const keyCheck = await queryDb('SELECT id FROM feature WHERE key = $1 LIMIT 1', [key]);
    if (keyCheck.rows.length > 0) {
      key = `${key}_${Date.now().toString().slice(-4)}`;
    }

    const description = data.description || '';

    const res = await queryDb(
      `INSERT INTO feature (name, key, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, key, description]
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

    const existingRes = await queryDb('SELECT * FROM feature WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const data = body.data || body;
    const name = data.name !== undefined ? (data.name || '').trim() : current.name;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Feature name cannot be empty' }, { status: 400 });
    }

    let key = data.key !== undefined ? generateFeatureKey(data.key) : current.key;
    if (!key) {
      key = generateFeatureKey(name) || `feat_${Date.now()}`;
    }

    const keyConflict = await queryDb('SELECT id FROM feature WHERE key = $1 AND id != $2 LIMIT 1', [key, Number(id)]);
    if (keyConflict.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Feature key "${key}" is already in use by another feature.` },
        { status: 400 }
      );
    }

    const description = data.description !== undefined ? data.description : current.description;

    const res = await queryDb(
      `UPDATE feature
       SET name = $1, key = $2, description = $3
       WHERE id = $4
       RETURNING *`,
      [name, key, description, Number(id)]
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

    const res = await queryDb('DELETE FROM feature WHERE id = $1 RETURNING id, name, key', [Number(id)]);
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

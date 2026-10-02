import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const res = await queryDb(`
      SELECT w.*, 
             (CASE WHEN w.status = 'active' AND NOT w.is_maintenance_mode THEN true ELSE false END) AS is_published,
             c.name AS creator_name, 
             c.email AS creator_email,
             p.name AS package_name
      FROM websites w
      LEFT JOIN creators c ON w.creator_id = c.id
      LEFT JOIN packages p ON w.package_id = p.id
      ORDER BY w.id DESC
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'websites', records: res.rows, websites: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE WEBSITE
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const rawData = body.data || body;
    const data = { ...rawData };

    if (!data.slug) {
      data.slug = (data.subdomain || data.name || 'site')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      data.slug = `${data.slug}-${Date.now().toString().slice(-4)}`;
    }

    if (data.is_published !== undefined) {
      const isPub = Boolean(data.is_published);
      data.is_maintenance_mode = !isPub;
      delete data.is_published;
    }

    if (data.status) {
      data.status = String(data.status).toLowerCase();
      if (!['active', 'pending', 'suspended', 'expired', 'archived'].includes(data.status)) {
        data.status = 'active';
      }
    } else {
      data.status = 'active';
    }

    const allowedKeys = [
      'creator_id', 'package_id', 'name', 'slug', 'subdomain', 'custom_domain',
      'custom_domain_verified', 'institution_type', 'eiin_number', 'status',
      'theme', 'primary_color', 'logo', 'logo_id', 'favicon', 'favicon_id',
      'contact_email', 'contact_phone', 'address', 'subscription_expires_at',
      'storage_used_mb', 'is_maintenance_mode'
    ];

    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO websites (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    const row = res.rows[0];
    return NextResponse.json({
      success: true,
      record: {
        ...row,
        is_published: row.status === 'active' && !row.is_maintenance_mode,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE WEBSITE
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    
    const rawData = body.data || body;
    const data = { ...rawData };

    if (data.is_published !== undefined) {
      const isPub = Boolean(data.is_published);
      data.is_maintenance_mode = !isPub;
      delete data.is_published;
    }

    if (data.status) {
      data.status = String(data.status).toLowerCase();
      if (!['active', 'pending', 'suspended', 'expired', 'archived'].includes(data.status)) {
        data.status = 'active';
      }
    }

    const allowedKeys = [
      'package_id', 'name', 'slug', 'subdomain', 'custom_domain',
      'custom_domain_verified', 'institution_type', 'eiin_number', 'status',
      'theme', 'primary_color', 'logo', 'logo_id', 'favicon', 'favicon_id',
      'contact_email', 'contact_phone', 'address', 'subscription_expires_at',
      'storage_used_mb', 'is_maintenance_mode'
    ];

    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);
    const res = await queryDb(
      `UPDATE websites SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    const row = res.rows[0];
    return NextResponse.json({
      success: true,
      record: {
        ...row,
        is_published: row.status === 'active' && !row.is_maintenance_mode,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE WEBSITE
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await queryDb('DELETE FROM websites WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

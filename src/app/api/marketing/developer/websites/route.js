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
             COALESCE(
               (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
               (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
               w.slug
             ) AS subdomain,
             (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
             (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
             (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information,
             c.name AS creator_name, 
             c.email AS creator_email,
             p.name AS package_name,
             p.slug AS package_slug,
             s.status AS subscription_status,
             s.current_period_end AS subscription_period_end
      FROM websites w
      LEFT JOIN creators c ON w.creator_id = c.id
      LEFT JOIN subscriptions s ON w.subscription_id = s.id
      LEFT JOIN packages p ON s.package_id = p.id
      ORDER BY w.id DESC
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'websites', records: res.rows, websites: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const rawData = body.data || body;
    const data = { ...rawData };
    delete data.package_id; 

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
      'creator_id', 'subscription_id', 'name', 'slug', 'institution_type', 'eiin_number', 'status',
      'theme', 'primary_color', 'secondary_color', 'logo', 'logo_id', 'favicon', 'favicon_id',
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

    if (row?.id) {
      const subVal = data.subdomain || data.slug || 'site';
      await queryDb(
        `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
         VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', 'domains.hiesci.com')
         ON CONFLICT (domain) DO NOTHING`,
        [row.id, subVal]
      ).catch(() => {});

      if (data.custom_domain) {
        await queryDb(
          `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
           VALUES ($1, 'custom_domain', $2, $2, FALSE, FALSE, 'CNAME', 'domains.hiesci.com')
           ON CONFLICT (domain) DO NOTHING`,
          [row.id, data.custom_domain]
        ).catch(() => {});
      }
    }

    if (row?.id && data.subscription_id) {
      const subId = Number(data.subscription_id);
      await queryDb(
        `UPDATE subscriptions SET website_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [row.id, subId]
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      record: {
        ...row,
        subdomain: data.subdomain || data.slug || 'site',
        custom_domain: data.custom_domain || null,
        is_published: row.status === 'active' && !row.is_maintenance_mode,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

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
    delete data.package_id; 

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

    if (data.subscription_id !== undefined) {
      const targetSubId = data.subscription_id ? Number(data.subscription_id) : null;
      if (targetSubId) {
        await queryDb(`UPDATE subscriptions SET website_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [id, targetSubId]).catch(() => {});
      } else {
        await queryDb(`UPDATE subscriptions SET website_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE website_id = $1`, [id]).catch(() => {});
      }
    }

    if (data.subdomain) {
      const subVal = String(data.subdomain).trim().toLowerCase();
      await queryDb(
        `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
         VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', 'domains.hiesci.com')
         ON CONFLICT (domain) DO UPDATE SET is_primary = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [id, subVal]
      ).catch(() => {});
    }

    if (data.custom_domain !== undefined) {
      const custVal = String(data.custom_domain || '').trim().toLowerCase();
      if (!custVal) {
        await queryDb(`DELETE FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain'`, [id]).catch(() => {});
      } else {
        await queryDb(
          `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
           VALUES ($1, 'custom_domain', $2, $2, FALSE, FALSE, 'CNAME', 'domains.hiesci.com')
           ON CONFLICT (domain) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [id, custVal]
        ).catch(() => {});
      }
    }

    const allowedKeys = [
      'creator_id', 'subscription_id', 'name', 'slug', 'institution_type', 'eiin_number', 'status',
      'theme', 'primary_color', 'secondary_color', 'logo', 'logo_id', 'favicon', 'favicon_id',
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

export const PATCH = PUT;

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

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

async function generateUniqueSlug(name, excludeId = null) {
  const baseSlug = slugify(name || 'package', { lower: true, strict: true, trim: true }) || 'package';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const params = excludeId ? [slug, Number(excludeId)] : [slug];
    const query = excludeId
      ? 'SELECT id FROM packages WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM packages WHERE slug = $1 LIMIT 1';
    const check = await queryDb(query, params);
    if (check.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// Fetch package helper with home and control modules
async function fetchFullPackageBySlugOrId(slugOrId) {
  const res = await queryDb(
    `SELECT p.*,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', hm.id,
                    'name', hm.name,
                    'slug', hm.slug,
                    'path', hm.path,
                    'category', hm.category,
                    'description', hm.description,
                    'icon', hm.icon,
                    'is_active', hm.is_active
                  ) ORDER BY hm.display_order ASC, hm.id ASC
                )
                FROM package_home_modules phm
                JOIN website_home_modules hm ON phm.home_module_id = hm.id
                WHERE phm.package_id = p.id
              ),
              '[]'::json
            ) AS home_modules,
            COALESCE(
              (
                SELECT json_agg(phm.home_module_id ORDER BY phm.home_module_id ASC)
                FROM package_home_modules phm
                WHERE phm.package_id = p.id
              ),
              '[]'::json
            ) AS home_module_ids,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', cm.id,
                    'name', cm.name,
                    'slug', cm.slug,
                    'path', cm.path,
                    'category', cm.category,
                    'description', cm.description,
                    'icon', cm.icon,
                    'is_active', cm.is_active
                  ) ORDER BY cm.category ASC, cm.display_order ASC, cm.id ASC
                )
                FROM package_control_modules pcm
                JOIN website_control_modules cm ON pcm.control_module_id = cm.id
                WHERE pcm.package_id = p.id
              ),
              '[]'::json
            ) AS control_modules,
            COALESCE(
              (
                SELECT json_agg(pcm.control_module_id ORDER BY pcm.control_module_id ASC)
                FROM package_control_modules pcm
                WHERE pcm.package_id = p.id
              ),
              '[]'::json
            ) AS control_module_ids
     FROM packages p
     WHERE p.slug = $1 OR p.id::text = $1
     LIMIT 1`,
    [slugOrId]
  );

  return res.rows[0] || null;
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const record = await fetchFullPackageBySlugOrId(cleanSlug);

    if (!record) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    // Count subscribers / active subscriptions
    let subscriptionsCount = 0;
    try {
      const subRes = await queryDb(
        `SELECT COUNT(*)::int AS count FROM subscription WHERE package_id = $1`,
        [record.id]
      );
      subscriptionsCount = subRes.rows[0]?.count || 0;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      record,
      package: record,
      subscriptions_count: subscriptionsCount,
    });
  } catch (error) {
    console.error('Developer package GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT * FROM packages WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const body = await request.json();
    const data = body.data || body;

    const name = data.name !== undefined ? (data.name || '').trim() : current.name;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Package name cannot be empty' }, { status: 400 });
    }

    let newSlug = current.slug;
    if (name && name !== current.name) {
      newSlug = await generateUniqueSlug(name, current.id);
    }

    const shortDescription = data.short_description !== undefined ? data.short_description : current.short_description;
    const tagline = data.tagline !== undefined ? (data.tagline || '').trim() : (current.tagline || '');
    const description = data.description !== undefined ? data.description : current.description;

    const monthlyPriceUsd = data.monthly_price_usd !== undefined
      ? Math.max(0, Number(data.monthly_price_usd) || 0)
      : Number(current.monthly_price_usd ?? current.monthly_price ?? 0);

    const yearlyPriceUsd = data.yearly_price_usd !== undefined
      ? Math.max(0, Number(data.yearly_price_usd) || 0)
      : Number(current.yearly_price_usd ?? current.yearly_price ?? 0);

    const monthlyPriceBdt = data.monthly_price_bdt !== undefined
      ? Math.max(0, Number(data.monthly_price_bdt) || 0)
      : Number(current.monthly_price_bdt ?? 0);

    const yearlyPriceBdt = data.yearly_price_bdt !== undefined
      ? Math.max(0, Number(data.yearly_price_bdt) || 0)
      : Number(current.yearly_price_bdt ?? 0);

    const discountPercentage = data.discount_percentage !== undefined
      ? Math.min(100, Math.max(0, Number(data.discount_percentage) || 0))
      : Number(current.discount_percentage || 0);

    const maxStudents = data.max_students !== undefined
      ? Math.max(1, Number(data.max_students))
      : (current.max_students || 500);

    const maxTeachers = data.max_teachers !== undefined
      ? Math.max(1, Number(data.max_teachers))
      : (current.max_teachers || 30);

    const maxStaff = data.max_staff !== undefined
      ? Math.max(1, Number(data.max_staff))
      : (current.max_staff || 20);

    const maxStorageMb = data.max_storage_mb !== undefined
      ? Math.max(100, Number(data.max_storage_mb))
      : (current.max_storage_mb || 5120);

    const maxStorage = data.max_storage !== undefined
      ? String(data.max_storage).trim()
      : (current.max_storage || `${Math.round(maxStorageMb / 1024)} GB`);

    const isAvailableStudentPanel = data.is_available_student_panel !== undefined
      ? Boolean(data.is_available_student_panel)
      : (current.is_available_student_panel !== undefined ? Boolean(current.is_available_student_panel) : true);

    const isAvailableTeacherPanel = data.is_available_teacher_panel !== undefined
      ? Boolean(data.is_available_teacher_panel)
      : (current.is_available_teacher_panel !== undefined ? Boolean(current.is_available_teacher_panel) : true);

    const isAvailableCustomDomain = data.is_available_custom_domain !== undefined
      ? Boolean(data.is_available_custom_domain)
      : (current.is_available_custom_domain !== undefined ? Boolean(current.is_available_custom_domain) : false);

    const isPopular = data.is_popular !== undefined ? Boolean(data.is_popular) : Boolean(current.is_popular);
    const isPublic = data.is_public !== undefined ? Boolean(data.is_public) : (current.is_public !== undefined ? Boolean(current.is_public) : true);
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : Boolean(current.is_active);
    const gracePeriod = data.grace_period !== undefined ? Math.max(0, Number(data.grace_period)) : (current.grace_period !== undefined ? Number(current.grace_period) : 3);
    const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) || 0 : (current.sort_order || 0);
    const monthlyMail = data.monthly_mail !== undefined
      ? Math.max(0, Number(data.monthly_mail))
      : (current.monthly_mail !== undefined ? Number(current.monthly_mail) : 1000);
    const monthlySms = data.monthly_sms !== undefined
      ? Math.max(0, Number(data.monthly_sms))
      : (current.monthly_sms !== undefined ? Number(current.monthly_sms) : 200);

    let featuresJson = current.features ? JSON.stringify(current.features) : '[]';
    if (data.features !== undefined) {
      featuresJson = Array.isArray(data.features)
        ? JSON.stringify(data.features)
        : (typeof data.features === 'object' && data.features !== null ? JSON.stringify(data.features) : '[]');
    }

    await queryDb(
      `UPDATE packages
       SET name = $1,
           slug = $2,
           short_description = $3,
           tagline = $4,
           description = $5,
           monthly_price_usd = $6,
           yearly_price_usd = $7,
           monthly_price_bdt = $8,
           yearly_price_bdt = $9,
           monthly_price = $10,
           yearly_price = $11,
           discount_percentage = $12,
           max_students = $13,
           max_teachers = $14,
           max_staff = $15,
           max_storage = $16,
           max_storage_mb = $17,
           is_available_student_panel = $18,
           is_available_teacher_panel = $19,
           is_available_custom_domain = $20,
           features = $21::jsonb,
           is_popular = $22,
           is_public = $23,
           is_active = $24,
           grace_period = $25,
           sort_order = $26,
           monthly_mail = $27,
           monthly_sms = $28,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $29`,
      [
        name, newSlug, shortDescription, tagline, description,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        monthlyPriceUsd, yearlyPriceUsd, discountPercentage,
        maxStudents, maxTeachers, maxStaff, maxStorage, maxStorageMb,
        isAvailableStudentPanel, isAvailableTeacherPanel, isAvailableCustomDomain,
        featuresJson, isPopular, isPublic, isActive, gracePeriod, sortOrder,
        monthlyMail, monthlySms,
        current.id
      ]
    );

    // Synchronize package_home_modules
    if (data.home_module_ids !== undefined || data.home_modules !== undefined) {
      let homeIds = [];
      if (Array.isArray(data.home_module_ids)) {
        homeIds = data.home_module_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
      } else if (Array.isArray(data.home_modules)) {
        homeIds = data.home_modules
          .map((m) => (typeof m === 'object' && m !== null ? Number(m.id) : Number(m)))
          .filter((n) => !isNaN(n) && n > 0);
      }

      await queryDb('DELETE FROM package_home_modules WHERE package_id = $1', [current.id]).catch(() => {});
      for (const hId of homeIds) {
        await queryDb(
          `INSERT INTO package_home_modules (package_id, home_module_id)
           VALUES ($1, $2)
           ON CONFLICT (package_id, home_module_id) DO NOTHING`,
          [current.id, hId]
        ).catch((e) => console.warn('Error syncing package_home_module:', e.message));
      }
    }

    // Synchronize package_control_modules
    if (data.control_module_ids !== undefined || data.control_modules !== undefined) {
      let controlIds = [];
      if (Array.isArray(data.control_module_ids)) {
        controlIds = data.control_module_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
      } else if (Array.isArray(data.control_modules)) {
        controlIds = data.control_modules
          .map((m) => (typeof m === 'object' && m !== null ? Number(m.id) : Number(m)))
          .filter((n) => !isNaN(n) && n > 0);
      }

      await queryDb('DELETE FROM package_control_modules WHERE package_id = $1', [current.id]).catch(() => {});
      for (const cId of controlIds) {
        await queryDb(
          `INSERT INTO package_control_modules (package_id, control_module_id)
           VALUES ($1, $2)
           ON CONFLICT (package_id, control_module_id) DO NOTHING`,
          [current.id, cId]
        ).catch((e) => console.warn('Error syncing package_control_module:', e.message));
      }
    }

    const updatedPackage = await fetchFullPackageBySlugOrId(newSlug);

    return NextResponse.json({
      success: true,
      record: updatedPackage,
      package: updatedPackage,
      message: 'Package updated successfully',
    });
  } catch (error) {
    console.error('Developer package PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const deleteRes = await queryDb(
      'DELETE FROM packages WHERE slug = $1 OR id::text = $1 RETURNING id, name',
      [cleanSlug]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Package "${deleteRes.rows[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer package DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

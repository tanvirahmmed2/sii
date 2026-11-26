import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { requireDeveloperPermission } from 'src/lib/middleware/developer';
import { invalidatePackagesCache } from 'src/lib/redis/redisClient';
import { generateUniquePackageSlug, syncPackageFeatures } from 'src/lib/packages/packageFeatures';
async function fetchFullPackageBySlugOrId(slugOrId: any) {
    const res = await queryDb(`SELECT p.*,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', pf.id,
                    'package_id', pf.package_id,
                    'title', pf.title,
                    'slug', pf.slug,
                    'display_order', pf.display_order,
                    'is_active', pf.is_active
                  ) ORDER BY pf.display_order ASC, pf.id ASC
                )
                FROM package_features pf
                WHERE pf.package_id = p.id
              ),
              '[]'::json
            ) AS package_features,
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
                    'is_active', hm.is_active,
                    'display_order', hm.display_order
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
                    'is_active', cm.is_active,
                    'display_order', cm.display_order
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
            ) AS control_module_ids,
            COALESCE(
              (SELECT COUNT(*)::int FROM subscriptions s WHERE s.package_id = p.id),
              0
            ) AS subscriptions_count,
            COALESCE(
              (SELECT COUNT(*)::int FROM websites w JOIN subscriptions s ON w.subscription_id = s.id WHERE s.package_id = p.id),
              0
            ) AS websites_count
     FROM packages p
     WHERE LOWER(p.slug) = LOWER($1) OR p.id::text = $1
     LIMIT 1`, [slugOrId]);
    return res.rows[0] || null;
}
export async function GET(request: any, { params }: any) {
    try {
        const auth = await requireDeveloperPermission(request, ['packages', 'package'], 'view');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.error || auth.message || 'Unauthorized' }, { status: auth.status || 401 });
        }
        const resolvedParams = await params;
        const rawSlug = resolvedParams?.slug;
        const cleanSlug = decodeURIComponent(rawSlug || '').trim();
        const record = await fetchFullPackageBySlugOrId(cleanSlug);
        if (!record) {
            return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            record,
            package: record,
            subscriptions_count: record.subscriptions_count || 0,
            websites_count: record.websites_count || 0,
        });
    }
    catch (error: any) {
        console.error('Developer package GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function PUT(request: any, { params }: any) {
    try {
        const auth = await requireDeveloperPermission(request, ['packages', 'package'], 'edit');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.error || auth.message || 'Access denied' }, { status: auth.status || 403 });
        }
        const resolvedParams = await params;
        const rawSlug = resolvedParams?.slug;
        const cleanSlug = decodeURIComponent(rawSlug || '').trim();
        const existingRes = await queryDb('SELECT * FROM packages WHERE LOWER(slug) = LOWER($1) OR id::text = $1 LIMIT 1', [cleanSlug]);
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
            newSlug = await generateUniquePackageSlug(name, current.id);
        }
        const shortDescription = data.short_description !== undefined ? data.short_description : current.short_description;
        const tagline = data.tagline !== undefined ? (data.tagline || '').trim() : (current.tagline || '');
        const description = data.description !== undefined ? data.description : current.description;
        const bdtPerMonth = data.bdt_per_month !== undefined
            ? Math.max(0, Number(data.bdt_per_month) || 0)
            : Number(current.bdt_per_month ?? 0);
        const usdPerMonth = data.usd_per_month !== undefined
            ? Math.max(0, Number(data.usd_per_month) || 0)
            : Number(current.usd_per_month ?? 0);
        const eurPerMonth = data.eur_per_month !== undefined
            ? Math.max(0, Number(data.eur_per_month) || 0)
            : Number(current.eur_per_month ?? (usdPerMonth * 0.92));
        const gbpPerMonth = data.gbp_per_month !== undefined
            ? Math.max(0, Number(data.gbp_per_month) || 0)
            : Number(current.gbp_per_month ?? (usdPerMonth * 0.79));
        const audPerMonth = data.aud_per_month !== undefined
            ? Math.max(0, Number(data.aud_per_month) || 0)
            : Number(current.aud_per_month ?? (usdPerMonth * 1.52));
        const cadPerMonth = data.cad_per_month !== undefined
            ? Math.max(0, Number(data.cad_per_month) || 0)
            : Number(current.cad_per_month ?? (usdPerMonth * 1.38));
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
        let featuresJson = current.features ? JSON.stringify(current.features) : '[]';
        if (data.features !== undefined) {
            featuresJson = Array.isArray(data.features)
                ? JSON.stringify(data.features)
                : (typeof data.features === 'object' && data.features !== null ? JSON.stringify(data.features) : '[]');
        }
        await queryDb(`UPDATE packages
       SET name = $1,
           slug = $2,
           short_description = $3,
           tagline = $4,
           description = $5,
           bdt_per_month = $6,
           usd_per_month = $7,
           eur_per_month = $8,
           gbp_per_month = $9,
           aud_per_month = $10,
           cad_per_month = $11,
           discount_percentage = $12,
           max_students = $13,
           max_teachers = $14,
           max_staff = $15,
           max_storage_mb = $16,
           is_available_student_panel = $17,
           is_available_teacher_panel = $18,
           is_available_custom_domain = $19,
           features = $20::jsonb,
           is_popular = $21,
           is_public = $22,
           is_active = $23,
           grace_period = $24,
           sort_order = $25,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $26`, [
            name, newSlug, shortDescription, tagline, description,
            bdtPerMonth, usdPerMonth, eurPerMonth, gbpPerMonth, audPerMonth, cadPerMonth,
            discountPercentage,
            maxStudents, maxTeachers, maxStaff, maxStorageMb,
            isAvailableStudentPanel, isAvailableTeacherPanel, isAvailableCustomDomain,
            featuresJson, isPopular, isPublic, isActive, gracePeriod, sortOrder,
            current.id
        ]);
        if (data.home_module_ids !== undefined || data.home_modules !== undefined) {
            let homeIds: any[] = [];
            if (Array.isArray(data.home_module_ids)) {
                homeIds = data.home_module_ids.map(Number).filter((n: any) => !isNaN(n) && n > 0);
            }
            else if (Array.isArray(data.home_modules)) {
                homeIds = data.home_modules
                    .map((m: any) => (typeof m === 'object' && m !== null ? Number(m.id) : Number(m)))
                    .filter((n: any) => !isNaN(n) && n > 0);
            }
            await queryDb('DELETE FROM package_home_modules WHERE package_id = $1', [current.id]).catch(() => { });
            if (homeIds.length > 0) {
                await queryDb(`INSERT INTO package_home_modules (package_id, home_module_id)
           SELECT $1, unnest($2::bigint[])
           ON CONFLICT (package_id, home_module_id) DO NOTHING`, [current.id, homeIds]).catch((e: any) => console.warn('Error syncing package_home_module batch:', e.message));
            }
        }
        if (data.control_module_ids !== undefined || data.control_modules !== undefined) {
            let controlIds: any[] = [];
            if (Array.isArray(data.control_module_ids)) {
                controlIds = data.control_module_ids.map(Number).filter((n: any) => !isNaN(n) && n > 0);
            }
            else if (Array.isArray(data.control_modules)) {
                controlIds = data.control_modules
                    .map((m: any) => (typeof m === 'object' && m !== null ? Number(m.id) : Number(m)))
                    .filter((n: any) => !isNaN(n) && n > 0);
            }
            await queryDb('DELETE FROM package_control_modules WHERE package_id = $1', [current.id]).catch(() => { });
            if (controlIds.length > 0) {
                await queryDb(`INSERT INTO package_control_modules (package_id, control_module_id)
           SELECT $1, unnest($2::bigint[])
           ON CONFLICT (package_id, control_module_id) DO NOTHING`, [current.id, controlIds]).catch((e: any) => console.warn('Error syncing package_control_module batch:', e.message));
            }
        }
        if (data.package_features !== undefined || data.features !== undefined) {
            const rawFeatList = data.package_features !== undefined ? data.package_features : data.features;
            await syncPackageFeatures(current.id, rawFeatList);
        }
        const updatedPackage = await fetchFullPackageBySlugOrId(newSlug);
        await invalidatePackagesCache();
        return NextResponse.json({
            success: true,
            record: updatedPackage,
            package: updatedPackage,
            message: 'Package and related module data updated successfully',
        });
    }
    catch (error: any) {
        console.error('Developer package PUT error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
export async function DELETE(request: any, { params }: any) {
    try {
        const auth = await requireDeveloperPermission(request, ['packages', 'package'], 'delete');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.error || auth.message || 'Access denied' }, { status: auth.status || 401 });
        }
        const resolvedParams = await params;
        const rawSlug = resolvedParams?.slug;
        const cleanSlug = decodeURIComponent(rawSlug || '').trim();
        const deleteRes = await queryDb('DELETE FROM packages WHERE LOWER(slug) = LOWER($1) OR id::text = $1 RETURNING id, name', [cleanSlug]);
        if (deleteRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
        }
        await invalidatePackagesCache();
        return NextResponse.json({
            success: true,
            message: `Package "${deleteRes.rows[0].name}" deleted successfully`,
        });
    }
    catch (error: any) {
        console.error('Developer package DELETE error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

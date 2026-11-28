import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasStaffModulePermission, verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { getWebsiteUrl } from 'src/lib/database/secret';
import { invalidateWebsiteCache } from 'src/lib/middleware/websiteResolver';
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    return verifyStaffModuleAccess(request, context, ['system', 'settings', 'routine'], action);
}
export async function GET(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'view');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const websiteId = auth.website.id;
        const [siteRes, domainsRes, configRes, modulesRes] = await Promise.all([
            queryDb(`SELECT w.*,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.billing_cycle AS subscription_billing_cycle,
                s.current_period_end AS subscription_period_end,
                p.id AS package_id,
                p.name AS package_name,
                p.max_students AS package_max_students,
                p.max_teachers AS package_max_teachers,
                p.max_staff AS package_max_staff,
                p.max_storage_mb AS package_max_storage_mb,
                p.is_available_student_panel,
                p.is_available_teacher_panel,
                p.is_available_custom_domain,
                p.features AS package_features
         FROM websites w
         LEFT JOIN subscriptions s ON s.id = w.subscription_id
         LEFT JOIN packages p ON p.id = s.package_id
         WHERE w.id = $1`, [websiteId]),
            queryDb(`SELECT * FROM website_domains WHERE website_id = $1 ORDER BY is_primary DESC, id ASC`, [websiteId]),
            queryDb(`SELECT * FROM website_academic_configs WHERE website_id = $1`, [websiteId]),
            Array.isArray(auth.website?.allowed_control_modules) && auth.website.allowed_control_modules.length > 0
                ? Promise.resolve({ rows: auth.website.allowed_control_modules })
                : queryDb(`SELECT cm.id, cm.slug, cm.name, cm.path, cm.category, cm.description, cm.icon
             FROM package_control_modules pcm
             JOIN website_control_modules cm ON cm.id = pcm.control_module_id
             JOIN websites w ON w.id = $1
             LEFT JOIN subscriptions s ON s.id = w.subscription_id
             WHERE pcm.package_id = COALESCE(s.package_id, 1) AND cm.is_active = TRUE
             ORDER BY cm.display_order ASC, cm.id ASC`, [websiteId]).catch(() => ({ rows: [] }))
        ]);
        if (siteRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
        }
        const website = siteRes.rows[0];
        const baseUrl = getWebsiteUrl(auth.website, request);
        const portals = {
            student: `${baseUrl}/auth/student`,
            teacher: `${baseUrl}/auth/access/teacher/login`,
            staff: `${baseUrl}/auth/access/staff/login`,
            officer: `${baseUrl}/auth/access/officer/login`
        };
        const canEdit = Boolean(auth.isCreator || hasStaffModulePermission(auth.staffSession, ['system', 'settings', 'routine'], 'edit'));
        const canEditAcademic = Boolean(auth.isCreator || hasStaffModulePermission(auth.staffSession, ['system', 'settings', 'routine', 'class-setup'], 'edit'));
        return NextResponse.json({
            success: true,
            website,
            domains: domainsRes.rows,
            academicConfig: configRes.rows[0] || auth.website?.academic_config || null,
            modules: modulesRes.rows || [],
            portals,
            permissions: {
                canEdit,
                canEditAcademic,
            },
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function PUT(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'edit');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { name, institution_type, eiin_number, currency, contact_email, contact_phone, address, facebook_url, twitter_url, instagram_url, youtube_url, linkedin_url, primary_color, secondary_color, theme, logo, logo_id, favicon, favicon_id, is_maintenance_mode, maintenance_message } = body;
        const updateRes = await queryDb(`UPDATE websites
       SET name = COALESCE($1, name),
           institution_type = COALESCE($2, institution_type),
           eiin_number = COALESCE($3, eiin_number),
           currency = COALESCE($4, currency),
           contact_email = COALESCE($5, contact_email),
           contact_phone = COALESCE($6, contact_phone),
           address = COALESCE($7, address),
           facebook_url = COALESCE($8, facebook_url),
           twitter_url = COALESCE($9, twitter_url),
           instagram_url = COALESCE($10, instagram_url),
           youtube_url = COALESCE($11, youtube_url),
           linkedin_url = COALESCE($12, linkedin_url),
           primary_color = COALESCE($13, primary_color),
           secondary_color = COALESCE($14, secondary_color),
           theme = COALESCE($15, theme),
           logo = CASE WHEN $16::text IS NOT NULL THEN $16::text ELSE logo END,
           logo_id = CASE WHEN $17::text IS NOT NULL THEN $17::text ELSE logo_id END,
           favicon = CASE WHEN $18::text IS NOT NULL THEN $18::text ELSE favicon END,
           favicon_id = CASE WHEN $19::text IS NOT NULL THEN $19::text ELSE favicon_id END,
           is_maintenance_mode = CASE WHEN $20::text IS NOT NULL THEN $21::boolean ELSE is_maintenance_mode END,
           maintenance_message = COALESCE($22, maintenance_message),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $23
       RETURNING *`, [
            name ? String(name).trim() : null,
            institution_type || null,
            eiin_number !== undefined ? String(eiin_number).trim() : null,
            currency || null,
            contact_email !== undefined ? String(contact_email).trim() : null,
            contact_phone !== undefined ? String(contact_phone).trim() : null,
            address !== undefined ? String(address).trim() : null,
            facebook_url !== undefined ? String(facebook_url).trim() : null,
            twitter_url !== undefined ? String(twitter_url).trim() : null,
            instagram_url !== undefined ? String(instagram_url).trim() : null,
            youtube_url !== undefined ? String(youtube_url).trim() : null,
            linkedin_url !== undefined ? String(linkedin_url).trim() : null,
            primary_color || null,
            secondary_color || null,
            theme || null,
            logo !== undefined ? logo : null,
            logo_id !== undefined ? logo_id : null,
            favicon !== undefined ? favicon : null,
            favicon_id !== undefined ? favicon_id : null,
            is_maintenance_mode !== undefined ? 'set' : null,
            Boolean(is_maintenance_mode),
            maintenance_message !== undefined ? String(maintenance_message).trim() : null,
            auth.website.id
        ]);
        await invalidateWebsiteCache(auth.website.id);
        return NextResponse.json({
            success: true,
            website: updateRes.rows[0],
            message: 'System configuration updated successfully.'
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

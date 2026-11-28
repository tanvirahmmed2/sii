import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { invalidateWebsiteCache } from 'src/lib/middleware/websiteResolver';
import { invalidateModulesCache, invalidateWebsiteModulesCache } from 'src/lib/redis/redisClient';

function filterModuleList(list: any[], { active, category, search }: any) {
    return (list || []).filter((m: any) => {
        if (active === 'true' && !m.is_active)
            return false;
        if (active === 'false' && m.is_active)
            return false;
        if (category && category.trim() && String(m.category || '').toLowerCase() !== category.trim().toLowerCase())
            return false;
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            const match = String(m.name || '').toLowerCase().includes(q) ||
                String(m.slug || '').toLowerCase().includes(q) ||
                String(m.description || '').toLowerCase().includes(q) ||
                String(m.path || '').toLowerCase().includes(q);
            if (!match)
                return false;
        }
        return true;
    });
}

export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const { searchParams } = new URL(request.url);
        const type = (searchParams.get('type') || 'all').toLowerCase();
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const active = searchParams.get('active');
        const scope = (searchParams.get('scope') || 'staff').toLowerCase();

        const staffSession = await getStaffSession(request).catch(() => null);
        const staffAllowedSet = staffSession && String(staffSession.websiteId || staffSession.website_id) === String(website.id) && Array.isArray(staffSession.allowedModules)
            ? new Set(staffSession.allowedModules.map((s: any) => String(s).toLowerCase()))
            : null;

        let homeModules: any[] = [];
        let controlModules: any[] = [];
        if (type === 'all' || type === 'home') {
            const baseHome = Array.isArray(website.allowed_home_modules) ? website.allowed_home_modules : [];
            homeModules = filterModuleList(baseHome, { active, category, search }).map((m: any) => ({
                ...m,
                in_package: true,
            }));
        }
        if (type === 'all' || type === 'control') {
            let baseControl = Array.isArray(website.allowed_control_modules) ? website.allowed_control_modules : [];
            if (scope === 'staff') {
                baseControl = baseControl.filter((m: any) => String(m.path || '').startsWith('/staff-panel/'));
            }
            if (staffAllowedSet) {
                baseControl = baseControl.filter((m: any) => staffAllowedSet.has(String(m.slug || '').toLowerCase()));
            }
            controlModules = filterModuleList(baseControl, { active, category, search }).map((m: any) => ({
                ...m,
                in_package: true,
                permitted: staffAllowedSet ? staffAllowedSet.has(String(m.slug || '').toLowerCase()) : true,
            }));
        }
        const homeCategories = Array.from(new Set(homeModules.map((m: any) => m.category).filter(Boolean)));
        const controlCategories = Array.from(new Set(controlModules.map((m: any) => m.category).filter(Boolean)));
        return NextResponse.json({
            success: true,
            website_id: website.id,
            institution_name: website.name,
            package: website.package || null,
            type,
            home_modules: homeModules,
            control_modules: controlModules,
            summary: {
                total_home: homeModules.length,
                total_control: controlModules.length,
                total_all: homeModules.length + controlModules.length,
                home_categories: homeCategories,
                control_categories: controlCategories,
                package_name: website.package?.name || null,
                cached: true,
            },
        });
    }
    catch (error: any) {
        console.error('Error fetching tenant modules:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function PATCH(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const body = await request.json();
        const { type, id, slug, is_active, display_order, description, name } = body;
        if (!type || (!id && !slug)) {
            return NextResponse.json({ success: false, error: 'Module type ("home" or "control") and id or slug are required.' }, { status: 400 });
        }
        const tableName = type.toLowerCase() === 'home' ? 'website_home_modules' : 'website_control_modules';
        const identifierCol = id ? 'id' : 'slug';
        const identifierVal = id || slug;
        const updates: any[] = [];
        const params: any[] = [];
        if (typeof is_active === 'boolean') {
            params.push(is_active);
            updates.push(`is_active = $${params.length}`);
        }
        if (typeof display_order === 'number') {
            params.push(display_order);
            updates.push(`display_order = $${params.length}`);
        }
        if (typeof description === 'string') {
            params.push(description.trim());
            updates.push(`description = $${params.length}`);
        }
        if (typeof name === 'string' && name.trim()) {
            params.push(name.trim());
            updates.push(`name = $${params.length}`);
        }
        if (updates.length === 0) {
            return NextResponse.json({ success: false, error: 'No fields provided to update.' }, { status: 400 });
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(identifierVal);
        const updateSql = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE ${identifierCol} = $${params.length}
      RETURNING *
    `;
        const res = await queryDb(updateSql, params);
        if (res.rowCount === 0) {
            return NextResponse.json({ success: false, error: `Module not found in ${tableName}.` }, { status: 404 });
        }
        await Promise.all([
            invalidateModulesCache(),
            invalidateWebsiteModulesCache(),
            invalidateWebsiteCache(website.id),
        ]).catch(() => { });
        return NextResponse.json({
            success: true,
            message: `${type === 'home' ? 'Home' : 'Control'} module updated successfully.`,
            module: res.rows[0],
        });
    }
    catch (error: any) {
        console.error('Error updating tenant module:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

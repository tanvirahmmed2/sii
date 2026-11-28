import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { invalidateWebsiteCache } from 'src/lib/middleware/websiteResolver';
import { invalidateModulesCache, invalidateWebsiteModulesCache } from 'src/lib/redis/redisClient';

export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const active = searchParams.get('active');
        const scope = (searchParams.get('scope') || 'all').toLowerCase();

        const staffSession = await getStaffSession(request).catch(() => null);
        const staffAllowedSet = staffSession && String(staffSession.websiteId || staffSession.website_id) === String(website.id) && Array.isArray(staffSession.allowedModules)
            ? new Set(staffSession.allowedModules.map((s: any) => String(s).toLowerCase()))
            : null;

        let modules = Array.isArray(website.allowed_control_modules) ? website.allowed_control_modules : [];
        if (scope === 'staff') {
            modules = modules.filter((m: any) => String(m.path || '').startsWith('/staff-panel/'));
        }
        if (staffAllowedSet) {
            modules = modules.filter((m: any) => staffAllowedSet.has(String(m.slug || '').toLowerCase()));
        }
        modules = modules.filter((m: any) => {
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
        const categories = Array.from(new Set(modules.map((m: any) => m.category).filter(Boolean)));
        return NextResponse.json({
            success: true,
            modules,
            total: modules.length,
            categories,
        });
    }
    catch (error: any) {
        console.error('Error fetching control modules:', error);
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
        const { id, slug, is_active, display_order, description, name, category, icon } = body;
        if (!id && !slug) {
            return NextResponse.json({ success: false, error: 'Module id or slug is required.' }, { status: 400 });
        }
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
        if (typeof category === 'string' && category.trim()) {
            params.push(category.trim());
            updates.push(`category = $${params.length}`);
        }
        if (typeof icon === 'string' && icon.trim()) {
            params.push(icon.trim());
            updates.push(`icon = $${params.length}`);
        }
        if (updates.length === 0) {
            return NextResponse.json({ success: false, error: 'No fields provided to update.' }, { status: 400 });
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        const identifierCol = id ? 'id' : 'slug';
        params.push(id || slug);
        const updateSql = `
      UPDATE website_control_modules
      SET ${updates.join(', ')}
      WHERE ${identifierCol} = $${params.length}
      RETURNING *
    `;
        const res = await queryDb(updateSql, params);
        if (res.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Control module not found.' }, { status: 404 });
        }
        await Promise.all([
            invalidateModulesCache(),
            invalidateWebsiteModulesCache(),
            invalidateWebsiteCache(website.id),
        ]).catch(() => { });
        return NextResponse.json({
            success: true,
            message: 'Control module updated successfully.',
            module: res.rows[0],
        });
    }
    catch (error: any) {
        console.error('Error updating control module:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

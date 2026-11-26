import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { fetchPackagesList } from 'src/lib/redis/redisClient';

export async function GET() {
    try {
        const packages = await fetchPackagesList(async () => {
            const res = await queryDb(`
                SELECT p.*,
                       (COALESCE(p.usd_per_month, 0) * 100)::int AS price_in_cents,
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
                           WHERE pf.package_id = p.id AND pf.is_active = TRUE
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
                               'category', hm.category
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
                           SELECT json_agg(
                             json_build_object(
                               'id', cm.id,
                               'name', cm.name,
                               'slug', cm.slug,
                               'path', cm.path,
                               'category', cm.category
                             ) ORDER BY cm.category ASC, cm.display_order ASC, cm.id ASC
                           )
                           FROM package_control_modules pcm
                           JOIN website_control_modules cm ON pcm.control_module_id = cm.id
                           WHERE pcm.package_id = p.id
                         ),
                         '[]'::json
                       ) AS control_modules
                FROM packages p
                WHERE p.is_active = TRUE AND p.is_public = TRUE
                ORDER BY p.sort_order ASC, p.bdt_per_month ASC, p.id ASC
            `);
            return res.rows || [];
        });
        return NextResponse.json({ success: true, packages });
    }
    catch (error: any) {
        console.error('Packages GET API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

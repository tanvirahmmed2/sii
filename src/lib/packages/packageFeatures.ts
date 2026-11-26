import slugify from 'slugify';
import { queryDb } from 'src/lib/database/db';

export async function generateUniquePackageSlug(name: string, excludeId: number | string | null = null): Promise<string> {
    const baseSlug = slugify(name || 'package', { lower: true, strict: true, trim: true }) || 'package';
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const params = excludeId ? [slug, Number(excludeId)] : [slug];
        const sql = excludeId
            ? 'SELECT id FROM packages WHERE slug = $1 AND id != $2 LIMIT 1'
            : 'SELECT id FROM packages WHERE slug = $1 LIMIT 1';
        const check = await queryDb(sql, params);
        if (check.rows.length === 0) return slug;
        counter++;
        slug = `${baseSlug}-${counter}`;
    }
}

export async function syncPackageFeatures(packageId: number, rawFeatures: any): Promise<any[]> {
    const items = Array.isArray(rawFeatures) ? rawFeatures : [];
    const normalized: { title: string; slug: string; display_order: number; is_active: boolean }[] = [];
    const usedSlugs = new Set<string>();

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rawTitle = typeof item === 'string'
            ? item
            : (item?.title ?? item?.name ?? '');
        const title = String(rawTitle || '').trim();
        if (!title) continue;

        const baseSlug = slugify(title, { lower: true, strict: true, trim: true }) || `feature-${i + 1}`;
        let uniqueSlug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(uniqueSlug)) {
            uniqueSlug = `${baseSlug}-${suffix++}`;
        }
        usedSlugs.add(uniqueSlug);

        const displayOrder = typeof item === 'object' && item !== null && item.display_order !== undefined
            ? Number(item.display_order) || normalized.length + 1
            : normalized.length + 1;
        const isActive = typeof item === 'object' && item !== null && item.is_active !== undefined
            ? Boolean(item.is_active)
            : true;

        normalized.push({
            title: title.slice(0, 255),
            slug: uniqueSlug.slice(0, 160),
            display_order: displayOrder,
            is_active: isActive,
        });
    }

    await queryDb('DELETE FROM package_features WHERE package_id = $1', [packageId]);

    for (const feat of normalized) {
        await queryDb(
            `INSERT INTO package_features (package_id, title, slug, display_order, is_active)
             VALUES ($1, $2, $3, $4, $5)`,
            [packageId, feat.title, feat.slug, feat.display_order, feat.is_active]
        );
    }

    const titlesOnly = normalized.filter((f) => f.is_active).map((f) => f.title);
    await queryDb(
        `UPDATE packages SET features = $1::jsonb WHERE id = $2`,
        [JSON.stringify(titlesOnly), packageId]
    ).catch(() => {});

    const insertedRes = await queryDb(
        `SELECT id, package_id, title, slug, display_order, is_active, created_at, updated_at
         FROM package_features
         WHERE package_id = $1
         ORDER BY display_order ASC, id ASC`,
        [packageId]
    ).catch(() => ({ rows: [] }));

    return insertedRes.rows || [];
}

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

async function ensureCreatorUpdatesTable() {
    await queryDb(`
        CREATE TABLE IF NOT EXISTS creator_updates (
            id BIGSERIAL PRIMARY KEY,
            creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
            update_id BIGINT NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            emailed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(creator_id, update_id)
        )
    `).catch(() => {});
}

export async function GET(request: any) {
    try {
        const sessionCreator = await getCreatorSession(request);
        const creatorId = sessionCreator?.id ? Number(sessionCreator.id) : null;

        await ensureCreatorUpdatesTable();

        if (creatorId) {
            await queryDb(
                `INSERT INTO creator_updates (creator_id, update_id)
                 SELECT $1, u.id FROM updates u
                 WHERE COALESCE(u.is_published, TRUE) = TRUE
                 ON CONFLICT (creator_id, update_id) DO NOTHING`,
                [creatorId]
            ).catch(() => {});

            const res = await queryDb(
                `SELECT u.id, u.version, u.title, u.slug, u.description, u.changelog, u.release_date, u.created_at,
                        COALESCE(cu.is_read, FALSE) AS is_read,
                        cu.read_at,
                        cu.emailed_at
                 FROM updates u
                 LEFT JOIN creator_updates cu ON cu.update_id = u.id AND cu.creator_id = $1
                 WHERE COALESCE(u.is_published, TRUE) = TRUE
                 ORDER BY COALESCE(u.release_date, u.created_at::date) DESC, u.id DESC
                 LIMIT 50`,
                [creatorId]
            ).catch(() => ({ rows: [] }));

            const unreadCount = res.rows.filter((u: any) => !u.is_read).length;
            return NextResponse.json({
                success: true,
                updates: res.rows,
                unreadCount,
            });
        }

        const res = await queryDb(
            `SELECT id, version, title, slug, description, changelog, release_date, created_at
             FROM updates
             WHERE COALESCE(is_published, TRUE) = TRUE
             ORDER BY COALESCE(release_date, created_at::date) DESC, id DESC
             LIMIT 25`
        ).catch(() => ({ rows: [] }));

        return NextResponse.json({ success: true, updates: res.rows, unreadCount: 0 });
    }
    catch (error: any) {
        console.error('Updates GET API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: any) {
    try {
        const sessionCreator = await getCreatorSession(request);
        if (!sessionCreator?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const creatorId = Number(sessionCreator.id);
        const body = await request.json().catch(() => ({}));
        const action = String(body.action || 'mark_read');

        await ensureCreatorUpdatesTable();

        if (action === 'mark_all_read') {
            await queryDb(
                `INSERT INTO creator_updates (creator_id, update_id, is_read, read_at)
                 SELECT $1, u.id, TRUE, CURRENT_TIMESTAMP
                 FROM updates u
                 WHERE COALESCE(u.is_published, TRUE) = TRUE
                 ON CONFLICT (creator_id, update_id)
                 DO UPDATE SET is_read = TRUE, read_at = COALESCE(creator_updates.read_at, CURRENT_TIMESTAMP)`,
                [creatorId]
            );
            return NextResponse.json({ success: true, unreadCount: 0 });
        }

        const updateId = Number(body.updateId);
        if (!updateId) {
            return NextResponse.json({ success: false, error: 'updateId is required' }, { status: 400 });
        }

        await queryDb(
            `INSERT INTO creator_updates (creator_id, update_id, is_read, read_at)
             VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP)
             ON CONFLICT (creator_id, update_id)
             DO UPDATE SET is_read = TRUE, read_at = COALESCE(creator_updates.read_at, CURRENT_TIMESTAMP)`,
            [creatorId, updateId]
        );

        const unreadRes = await queryDb(
            `SELECT COUNT(*)::int AS cnt
             FROM updates u
             LEFT JOIN creator_updates cu ON cu.update_id = u.id AND cu.creator_id = $1
             WHERE COALESCE(u.is_published, TRUE) = TRUE AND COALESCE(cu.is_read, FALSE) = FALSE`,
            [creatorId]
        ).catch(() => ({ rows: [{ cnt: 0 }] }));

        return NextResponse.json({
            success: true,
            unreadCount: Number(unreadRes.rows[0]?.cnt || 0),
        });
    }
    catch (error: any) {
        console.error('Creator updates POST error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const PATCH = POST;

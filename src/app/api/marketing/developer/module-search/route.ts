import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from 'src/lib/middleware/developer';
import { searchDeveloperModulesInRedis } from 'src/lib/redis/redisClient';

/**
 * GET /api/marketing/developer/module-search?q=...
 * Returns the authenticated developer's allowed panel modules matching the query, cached/indexed in Redis.
 */
export async function GET(request: any) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const q = request?.nextUrl?.searchParams?.get('q') || '';
        const result = await searchDeveloperModulesInRedis(user, q);

        return NextResponse.json({
            success: true,
            query: q,
            modules: result.modules,
            source: result.source,
            cached: result.cached,
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || 'Failed to search modules.' }, { status: 500 });
    }
}

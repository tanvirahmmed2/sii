import { NextResponse } from 'next/server';
import { clearDeveloperSessionCookie, verifyJWT } from 'src/lib/middleware/developer';
import { DEVELOPER_TOKEN } from 'src/lib/database/secret';
import { queryDb } from 'src/lib/database/db';
import { invalidateDeveloperLoginSessionCache } from 'src/lib/redis/redisClient';
import { recordDeveloperActivity } from 'src/lib/database/activity_logger';

export async function POST(request: any) {
    try {
        const token = request?.cookies?.get?.(DEVELOPER_TOKEN)?.value ||
            request?.headers?.get?.('authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = verifyJWT(token);
            await queryDb(`UPDATE developer_login_sessions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE token = $1`, [token]).catch(() => { });
            await invalidateDeveloperLoginSessionCache(decoded?.id, token).catch(() => { });
            const rawIp = request?.headers?.get?.('x-forwarded-for') || request?.headers?.get?.('x-real-ip') || null;
            await recordDeveloperActivity({
                developerId: decoded?.id || null,
                developerEmail: decoded?.email || null,
                method: 'POST',
                module: 'auth-logout',
                action: 'LOGOUT',
                endpoint: '/api/marketing/developer/me/logout',
                ipAddress: rawIp ? String(rawIp).split(',')[0].trim() : null,
                userAgent: request?.headers?.get?.('user-agent') || null,
                details: { event: 'Developer signed out' },
            });
        }
        const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
        await clearDeveloperSessionCookie(response);
        return response;
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Logout failed.' }, { status: 500 });
    }
}

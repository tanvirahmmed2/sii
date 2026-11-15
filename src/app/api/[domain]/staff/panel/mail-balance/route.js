import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff.js';
import { getCurrentYearMonth } from 'src/lib/database/usageLimiter.js';
import { getMonthlyMailAnalytics } from 'src/lib/redis/redisClient.js';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    const auth = await verifyStaffModuleAccess(request, context, ['settings', 'communications', 'general'], 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteId = auth.website.id;
    const { searchParams } = new URL(request.url);

    const monthParam = searchParams.get('month')?.trim();
    const currentMonth = getCurrentYearMonth();
    const yearMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth;

    const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit'), 10) || 20));
    const offset = (page - 1) * limit;

    const recipientType = searchParams.get('recipient_type')?.toLowerCase().trim();
    const type = searchParams.get('type')?.toLowerCase().trim();
    const status = searchParams.get('status')?.trim();
    const search = searchParams.get('search')?.trim();

    const analytics = await getMonthlyMailAnalytics(websiteId, yearMonth);

    const historyRes = await queryDb(
      `SELECT year_month, mail_count, sms_count
       FROM website_monthly_usages
       WHERE website_id = $1
       ORDER BY year_month DESC
       LIMIT 6`,
      [websiteId]
    );

    let whereSql = `WHERE website_id = $1 AND year_month = $2`;
    const params = [websiteId, yearMonth];

    if (recipientType && recipientType !== 'all') {
      params.push(recipientType);
      whereSql += ` AND LOWER(recipient_type) = $${params.length}`;
    }

    if (type && type !== 'all') {
      params.push(type);
      whereSql += ` AND LOWER(type) = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereSql += ` AND LOWER(status) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereSql += ` AND (
        recipient_identifier ILIKE $${params.length}
        OR recipient_name ILIKE $${params.length}
        OR subject ILIKE $${params.length}
        OR content ILIKE $${params.length}
      )`;
    }

    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM website_sent_mails ${whereSql}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const logParams = [...params, limit, offset];
    const logsRes = await queryDb(
      `SELECT id, website_id, recipient_type, recipient_id, recipient_identifier,
              recipient_name, type, subject, content, status, failure_reason,
              provider, year_month, created_at, updated_at
       FROM website_sent_mails
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${logParams.length - 1} OFFSET $${logParams.length}`,
      logParams
    );

    return NextResponse.json({
      success: true,
      analytics,
      history: historyRes.rows,
      logs: logsRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

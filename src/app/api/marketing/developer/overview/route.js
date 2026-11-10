import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getDeveloperSession } from 'src/lib/middleware/developer';

export async function GET(request) {
  try {
    const session = await getDeveloperSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [
      devsRes,
      pkgsRes,
      websitesRes,
      subsRes,
      blogsRes,
      supportRes,
      leadsRes,
      subscribersRes,
      paymentsRes,
      tasksRes,
      noticesRes
    ] = await Promise.all([
      queryDb('SELECT COUNT(*)::int AS count FROM developers WHERE is_active = TRUE').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM packages WHERE is_active = TRUE').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM websites').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM subscriptions WHERE status = \'active\'').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM blogs WHERE is_published = TRUE').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM supports WHERE status = \'open\'').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM leads').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM subscribers WHERE status = \'active\'').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT amount, currency, gateway, status FROM payments WHERE status IN (\'successful\', \'completed\')').catch(() => ({ rows: [] })),
      queryDb('SELECT COUNT(*)::int AS count FROM developer_tasks WHERE LOWER(status) NOT IN (\'completed\', \'cancelled\')').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT COUNT(*)::int AS count FROM notices').catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    let revUsd = 0;
    let revBdt = 0;
    (paymentsRes.rows || []).forEach((p) => {
      const curr = String(p.currency || (p.gateway === 'bkash' ? 'BDT' : 'USD')).toUpperCase();
      const amount = Number(p.amount || 0);
      if (curr === 'BDT') revBdt += amount;
      else revUsd += amount;
    });

    return NextResponse.json({
      success: true,
      developer: session,
      counts: {
        developers: devsRes.rows[0]?.count || 0,
        packages: pkgsRes.rows[0]?.count || 0,
        websites: websitesRes.rows[0]?.count || 0,
        subscriptions: subsRes.rows[0]?.count || 0,
        blogs: blogsRes.rows[0]?.count || 0,
        support: supportRes.rows[0]?.count || 0,
        leads: leadsRes.rows[0]?.count || 0,
        subscribers: subscribersRes.rows[0]?.count || 0,
        tasks: tasksRes.rows[0]?.count || 0,
        notices: noticesRes.rows[0]?.count || 0,
        revenueUsd: revUsd,
        revenueBdt: revBdt,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


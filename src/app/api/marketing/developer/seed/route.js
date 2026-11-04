import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { runAllSeeds } from 'seed/index';

/**
 * GET /api/marketing/developer/seed
 * Introspect current database setup status
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'modules');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const [tablesRes, devsRes, modsRes, wmodsRes, hmodsRes, cmodsRes] = await Promise.all([
      queryDb("SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'").catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM developers').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM modules').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM website_modules').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM website_home_modules').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM website_control_modules').catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        total_tables: tablesRes.rows[0]?.count || 0,
        developers: devsRes.rows[0]?.count || 0,
        platform_modules: modsRes.rows[0]?.count || 0,
        website_modules: wmodsRes.rows[0]?.count || 0,
        home_modules: hmodsRes.rows[0]?.count || 0,
        control_modules: cmodsRes.rows[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error in developer seed status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/marketing/developer/seed
 * Run full setup directly from developer panel
 */
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'modules');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch (_) {}

    const setupResult = await runAllSeeds(body);

    return NextResponse.json({
      success: true,
      message: 'Full system setup executed successfully.',
      setup: setupResult,
    });
  } catch (error) {
    console.error('Error during developer seed setup execution:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


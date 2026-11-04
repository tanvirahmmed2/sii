import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { runAllSeeds } from 'seed/index';

/**
 * GET /api/seed
 * Introspect current database setup and counts across tables, developer accounts,
 * platform modules, public home modules, and staff control modules.
 */
export async function GET() {
  try {
    const [tablesRes, devsRes, modsRes, wmodsRes, hmodsRes, cmodsRes] = await Promise.all([
      queryDb("SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'").catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM developers').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM modules').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM website_modules').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM website_home_modules').catch(() => ({ rows: [{ count: 0 }] })),
      queryDb('SELECT count(*)::int as count FROM website_control_modules').catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const totalTables = tablesRes.rows[0]?.count || 0;
    const developersCount = devsRes.rows[0]?.count || 0;
    const platformModulesCount = modsRes.rows[0]?.count || 0;
    const websiteModulesCount = wmodsRes.rows[0]?.count || 0;
    const homeModulesCount = hmodsRes.rows[0]?.count || 0;
    const controlModulesCount = cmodsRes.rows[0]?.count || 0;

    const isFullySeeded =
      totalTables >= 200 &&
      developersCount >= 1 &&
      platformModulesCount >= 30 &&
      websiteModulesCount >= 15 &&
      homeModulesCount >= 20 &&
      controlModulesCount >= 150;

    return NextResponse.json({
      success: true,
      status: isFullySeeded ? 'ready' : 'incomplete',
      counts: {
        total_tables: totalTables,
        developers: developersCount,
        platform_modules: platformModulesCount,
        website_modules: websiteModulesCount,
        home_modules: homeModulesCount,
        control_modules: controlModulesCount,
      },
      message: isFullySeeded
        ? 'All tables, developer accounts, home modules, and control modules are fully seeded.'
        : 'Database setup is incomplete. Run POST /api/seed or "node seed/index.js" to complete full setup.',
    });
  } catch (error) {
    console.error('Error checking seed status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/seed
 * Triggers full automated setup:
 * 1. Uploads all tables (schema.psql + website_tables.psql)
 * 2. Directly seeds modules into tables (no defaults runtime hack)
 * 3. Seeds developer account & grants all module permissions
 * 4. Seeds website_home_modules directly from [domain]/(home)/*
 * 5. Seeds website_control_modules directly from [domain]/(staffs)/staff-panel/*
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {}

    const setupResult = await runAllSeeds(body);

    return NextResponse.json({
      success: true,
      message: 'Full database, developer, home modules, and control modules setup completed successfully!',
      setup: setupResult,
    });
  } catch (error) {
    console.error('Error during automated seed setup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Automated setup failed.',
      },
      { status: 500 }
    );
  }
}


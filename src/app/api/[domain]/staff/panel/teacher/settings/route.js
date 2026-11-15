import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;

    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_teacher_settings (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        require_verification BOOLEAN DEFAULT TRUE,
        enable_two_factor BOOLEAN DEFAULT FALSE,
        allow_password_recovery BOOLEAN DEFAULT TRUE,
        max_daily_periods INT DEFAULT 6,
        check_in_grace_minutes INT DEFAULT 15,
        default_probation_months INT DEFAULT 6,
        id_card_prefix VARCHAR(50) DEFAULT 'FAC-',
        custom_rules JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id)
      )
    `);

    let settingsRes = await queryDb(
      `SELECT * FROM website_teacher_settings WHERE website_id = $1 LIMIT 1`,
      [website.id]
    );

    if (settingsRes.rows.length === 0) {
      const initRes = await queryDb(
        `INSERT INTO website_teacher_settings (
           website_id, require_verification, enable_two_factor, allow_password_recovery,
           max_daily_periods, check_in_grace_minutes, default_probation_months, id_card_prefix
         ) VALUES ($1, TRUE, FALSE, TRUE, 6, 15, 6, 'FAC-')
         ON CONFLICT (website_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [website.id]
      );
      settingsRes = initRes;
    }

    const statsRes = await queryDb(
      `SELECT 
         COUNT(*)::int AS total_teachers,
         COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_teachers,
         COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive_teachers,
         COUNT(*) FILTER (WHERE is_registered = TRUE)::int AS registered_teachers,
         COUNT(DISTINCT designation_id)::int AS total_designations,
         COUNT(DISTINCT department_id)::int AS total_departments
       FROM website_teachers
       WHERE website_id = $1`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      settings: settingsRes.rows[0],
      stats: statsRes.rows[0] || {
        total_teachers: 0,
        active_teachers: 0,
        inactive_teachers: 0,
        registered_teachers: 0,
        total_designations: 0,
        total_departments: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching teacher settings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch settings.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const {
      require_verification = true,
      enable_two_factor = false,
      allow_password_recovery = true,
      max_daily_periods = 6,
      check_in_grace_minutes = 15,
      default_probation_months = 6,
      id_card_prefix = 'FAC-',
      custom_rules = {},
    } = body;

    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_teacher_settings (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        require_verification BOOLEAN DEFAULT TRUE,
        enable_two_factor BOOLEAN DEFAULT FALSE,
        allow_password_recovery BOOLEAN DEFAULT TRUE,
        max_daily_periods INT DEFAULT 6,
        check_in_grace_minutes INT DEFAULT 15,
        default_probation_months INT DEFAULT 6,
        id_card_prefix VARCHAR(50) DEFAULT 'FAC-',
        custom_rules JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id)
      )
    `);

    const upsertRes = await queryDb(
      `INSERT INTO website_teacher_settings (
         website_id, require_verification, enable_two_factor, allow_password_recovery,
         max_daily_periods, check_in_grace_minutes, default_probation_months, id_card_prefix, custom_rules,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (website_id) DO UPDATE SET
         require_verification = EXCLUDED.require_verification,
         enable_two_factor = EXCLUDED.enable_two_factor,
         allow_password_recovery = EXCLUDED.allow_password_recovery,
         max_daily_periods = EXCLUDED.max_daily_periods,
         check_in_grace_minutes = EXCLUDED.check_in_grace_minutes,
         default_probation_months = EXCLUDED.default_probation_months,
         id_card_prefix = EXCLUDED.id_card_prefix,
         custom_rules = EXCLUDED.custom_rules,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        website.id,
        Boolean(require_verification),
        Boolean(enable_two_factor),
        Boolean(allow_password_recovery),
        Math.max(1, Math.min(24, parseInt(max_daily_periods, 10) || 6)),
        Math.max(0, Math.min(180, parseInt(check_in_grace_minutes, 10) || 15)),
        Math.max(0, Math.min(60, parseInt(default_probation_months, 10) || 6)),
        (id_card_prefix || 'FAC-').trim(),
        JSON.stringify(custom_rules || {}),
      ]
    );

    return NextResponse.json({
      success: true,
      settings: upsertRes.rows[0],
      message: 'Teacher settings updated successfully.',
    });
  } catch (error) {
    console.error('Error saving teacher settings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save settings.' }, { status: 500 });
  }
}

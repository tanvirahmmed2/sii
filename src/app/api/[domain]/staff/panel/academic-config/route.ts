import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasStaffModulePermission, verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { invalidateWebsiteCache } from 'src/lib/middleware/websiteResolver';
import { invalidateWebsiteModulesCache } from 'src/lib/redis/redisClient';
import {
  buildAcademicConfigPayload,
  DEFAULT_ACADEMIC_CONFIG,
  normalizeAcademicConfig,
} from 'src/lib/modules/academicConfig';

async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
  return verifyStaffModuleAccess(request, context, ['system', 'settings', 'routine', 'class-setup'], action);
}

export async function GET(request: any, context: any) {
  try {
    const auth = await verifyStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const websiteId = auth.website.id;
    const canEdit = Boolean(
      auth.isCreator || hasStaffModulePermission(auth.staffSession, ['system', 'settings', 'routine', 'class-setup'], 'edit')
    );
    const existingRes = await queryDb(`SELECT * FROM website_academic_configs WHERE website_id = $1`, [websiteId]);
    if (existingRes.rows.length > 0) {
      return NextResponse.json({
        success: true,
        canEdit,
        config: normalizeAcademicConfig(existingRes.rows[0]),
      });
    }

    const seedRes = await queryDb(
      `INSERT INTO website_academic_configs (
         website_id,
         hierarchy_type,
         primary_col,
         use_department,
         use_session,
         use_class,
         use_section,
         require_department,
         require_session,
         require_class,
         require_section,
         labels,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
       ON CONFLICT (website_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [
        websiteId,
        DEFAULT_ACADEMIC_CONFIG.hierarchy_type,
        DEFAULT_ACADEMIC_CONFIG.primary_col,
        DEFAULT_ACADEMIC_CONFIG.use_department,
        DEFAULT_ACADEMIC_CONFIG.use_session,
        DEFAULT_ACADEMIC_CONFIG.use_class,
        DEFAULT_ACADEMIC_CONFIG.use_section,
        DEFAULT_ACADEMIC_CONFIG.require_department,
        DEFAULT_ACADEMIC_CONFIG.require_session,
        DEFAULT_ACADEMIC_CONFIG.require_class,
        DEFAULT_ACADEMIC_CONFIG.require_section,
        JSON.stringify(DEFAULT_ACADEMIC_CONFIG.labels),
      ]
    );
    return NextResponse.json({
      success: true,
      canEdit,
      config: normalizeAcademicConfig(seedRes.rows[0]),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any, context: any) {
  try {
    const auth = await verifyStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const body = await request.json().catch(() => ({}));
    const rawHasAny =
      Boolean(body?.use_department) ||
      Boolean(body?.use_session) ||
      Boolean(body?.use_class) ||
      Boolean(body?.use_section);
    if (String(body?.hierarchy_type || '').toUpperCase() === 'CUSTOM' && !rawHasAny) {
      return NextResponse.json(
        { success: false, error: 'At least one academic dimension must remain enabled.' },
        { status: 400 }
      );
    }

    const resolved = buildAcademicConfigPayload(body);

    const upsertRes = await queryDb(
      `INSERT INTO website_academic_configs (
         website_id,
         hierarchy_type,
         primary_col,
         use_department,
         use_session,
         use_class,
         use_section,
         require_department,
         require_session,
         require_class,
         require_section,
         labels,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
       ON CONFLICT (website_id) DO UPDATE SET
         hierarchy_type = EXCLUDED.hierarchy_type,
         primary_col = EXCLUDED.primary_col,
         use_department = EXCLUDED.use_department,
         use_session = EXCLUDED.use_session,
         use_class = EXCLUDED.use_class,
         use_section = EXCLUDED.use_section,
         require_department = EXCLUDED.require_department,
         require_session = EXCLUDED.require_session,
         require_class = EXCLUDED.require_class,
         require_section = EXCLUDED.require_section,
         labels = EXCLUDED.labels,
         updated_at = NOW()
       RETURNING *`,
      [
        auth.website.id,
        resolved.hierarchy_type,
        resolved.primary_col,
        resolved.use_department,
        resolved.use_session,
        resolved.use_class,
        resolved.use_section,
        resolved.require_department,
        resolved.require_session,
        resolved.require_class,
        resolved.require_section,
        JSON.stringify(resolved.labels),
      ]
    );
    await Promise.all([
      invalidateWebsiteCache(auth.website.id),
      invalidateWebsiteModulesCache(auth.website.id),
    ]).catch(() => {});
    return NextResponse.json({
      success: true,
      canEdit: true,
      config: normalizeAcademicConfig(upsertRes.rows[0]),
      message: 'Academic hierarchy configuration saved successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

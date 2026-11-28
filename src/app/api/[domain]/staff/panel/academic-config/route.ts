import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasStaffModulePermission, verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { invalidateWebsiteCache } from 'src/lib/middleware/websiteResolver';
import { invalidateWebsiteModulesCache } from 'src/lib/redis/redisClient';
const VALID_HIERARCHIES = ['DEPT_SESSION_SEC', 'CLASS_SEC', 'DEPT_CLASS_SEC', 'CUSTOM'];
const DEFAULT_LABELS = {
    department: 'Department',
    session: 'Academic Year',
    class: 'Class',
    section: 'Section'
};
const PRESETS = {
    DEPT_SESSION_SEC: {
        use_department: true,
        require_department: true,
        use_session: true,
        require_session: true,
        use_class: false,
        require_class: false,
        use_section: true,
        require_section: false
    },
    CLASS_SEC: {
        use_department: false,
        require_department: false,
        use_session: true,
        require_session: true,
        use_class: true,
        require_class: true,
        use_section: true,
        require_section: false
    },
    DEPT_CLASS_SEC: {
        use_department: true,
        require_department: true,
        use_session: true,
        require_session: true,
        use_class: true,
        require_class: true,
        use_section: true,
        require_section: false
    }
};
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    return verifyStaffModuleAccess(request, context, ['system', 'settings', 'routine', 'class-setup'], action);
}
export async function GET(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'view');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const websiteId = auth.website.id;
        const canEdit = Boolean(auth.isCreator || hasStaffModulePermission(auth.staffSession, ['system', 'settings', 'routine', 'class-setup'], 'edit'));
        const existingRes = await queryDb(`SELECT * FROM website_academic_configs WHERE website_id = $1`, [websiteId]);
        if (existingRes.rows.length > 0) {
            return NextResponse.json({
                success: true,
                canEdit,
                config: existingRes.rows[0]
            });
        }
        const defaultPreset = PRESETS.CLASS_SEC;
        const seedRes = await queryDb(`INSERT INTO website_academic_configs (
          website_id,
          hierarchy_type,
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
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
       ON CONFLICT (website_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`, [
            websiteId,
            'CLASS_SEC',
            defaultPreset.use_department,
            defaultPreset.use_session,
            defaultPreset.use_class,
            defaultPreset.use_section,
            defaultPreset.require_department,
            defaultPreset.require_session,
            defaultPreset.require_class,
            defaultPreset.require_section,
            JSON.stringify(DEFAULT_LABELS)
        ]);
        return NextResponse.json({
            success: true,
            config: seedRes.rows[0]
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function POST(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'edit');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { hierarchy_type = 'CLASS_SEC', use_department, use_session, use_class, use_section, require_department, require_session, require_class, require_section, labels } = body;
        const resolvedHierarchy = VALID_HIERARCHIES.includes(hierarchy_type) ? hierarchy_type : 'CLASS_SEC';
        let finalUseDept = Boolean(use_department);
        let finalReqDept = Boolean(require_department);
        let finalUseSession = Boolean(use_session);
        let finalReqSession = Boolean(require_session);
        let finalUseClass = Boolean(use_class);
        let finalReqClass = Boolean(require_class);
        let finalUseSection = Boolean(use_section);
        let finalReqSection = Boolean(require_section);
        if (resolvedHierarchy !== 'CUSTOM' && (PRESETS as Record<string, any>)[resolvedHierarchy]) {
            const preset = (PRESETS as Record<string, any>)[resolvedHierarchy];
            finalUseDept = preset.use_department;
            finalReqDept = preset.require_department;
            finalUseSession = preset.use_session;
            finalReqSession = preset.require_session;
            finalUseClass = preset.use_class;
            finalReqClass = preset.require_class;
            finalUseSection = preset.use_section;
            finalReqSection = preset.require_section;
        }
        const mergedLabels = {
            department: labels?.department ? String(labels.department).trim() : DEFAULT_LABELS.department,
            session: labels?.session ? String(labels.session).trim() : DEFAULT_LABELS.session,
            class: labels?.class ? String(labels.class).trim() : DEFAULT_LABELS.class,
            section: labels?.section ? String(labels.section).trim() : DEFAULT_LABELS.section
        };
        const upsertRes = await queryDb(`INSERT INTO website_academic_configs (
          website_id,
          hierarchy_type,
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
      ON CONFLICT (website_id) DO UPDATE SET
          hierarchy_type = EXCLUDED.hierarchy_type,
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
      RETURNING *`, [
            auth.website.id,
            resolvedHierarchy,
            finalUseDept,
            finalUseSession,
            finalUseClass,
            finalUseSection,
            finalReqDept,
            finalReqSession,
            finalReqClass,
            finalReqSection,
            JSON.stringify(mergedLabels)
        ]);
        await Promise.all([
            invalidateWebsiteCache(auth.website.id),
            invalidateWebsiteModulesCache(auth.website.id),
        ]).catch(() => { });
        return NextResponse.json({
            success: true,
            config: upsertRes.rows[0],
            message: 'Academic hierarchy configuration saved successfully.'
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

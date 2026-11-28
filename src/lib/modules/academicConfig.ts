import { queryDb } from 'src/lib/database/db';

export type AcademicDimension = 'department' | 'class' | 'session' | 'section';

export const DEFAULT_ACADEMIC_CONFIG = {
  hierarchy_type: 'CLASS_SEC',
  use_department: false,
  use_session: true,
  use_class: true,
  use_section: true,
  require_department: false,
  require_session: true,
  require_class: true,
  require_section: false,
  labels: {
    department: 'Department',
    session: 'Academic Year',
    class: 'Class',
    section: 'Section',
  },
};

export function normalizeAcademicConfig(raw: any) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ACADEMIC_CONFIG, labels: { ...DEFAULT_ACADEMIC_CONFIG.labels } };
  }
  return {
    ...raw,
    hierarchy_type: raw.hierarchy_type || 'CLASS_SEC',
    use_department: Boolean(raw.use_department),
    use_session: raw.use_session === undefined ? true : Boolean(raw.use_session),
    use_class: raw.use_class === undefined ? true : Boolean(raw.use_class),
    use_section: raw.use_section === undefined ? true : Boolean(raw.use_section),
    require_department: Boolean(raw.require_department),
    require_session: raw.require_session === undefined ? true : Boolean(raw.require_session),
    require_class: raw.require_class === undefined ? true : Boolean(raw.require_class),
    require_section: Boolean(raw.require_section),
    labels: {
      department: raw.labels?.department || DEFAULT_ACADEMIC_CONFIG.labels.department,
      session: raw.labels?.session || DEFAULT_ACADEMIC_CONFIG.labels.session,
      class: raw.labels?.class || DEFAULT_ACADEMIC_CONFIG.labels.class,
      section: raw.labels?.section || DEFAULT_ACADEMIC_CONFIG.labels.section,
    },
  };
}

export async function getWebsiteAcademicConfig(websiteOrId: any) {
  if (websiteOrId && typeof websiteOrId === 'object' && websiteOrId.academic_config) {
    return normalizeAcademicConfig(websiteOrId.academic_config);
  }
  const websiteId = typeof websiteOrId === 'object' ? websiteOrId?.id : websiteOrId;
  if (!websiteId) {
    return normalizeAcademicConfig(null);
  }
  try {
    const res = await queryDb(`SELECT * FROM website_academic_configs WHERE website_id = $1 LIMIT 1`, [websiteId]);
    if (res.rows && res.rows.length > 0) {
      return normalizeAcademicConfig(res.rows[0]);
    }
  } catch { }
  return normalizeAcademicConfig(null);
}

export async function verifyAcademicDimensionEnabled(
  websiteOrId: any,
  dimension: AcademicDimension
) {
  const config = await getWebsiteAcademicConfig(websiteOrId);
  const flagMap: Record<AcademicDimension, boolean> = {
    department: Boolean(config.use_department),
    class: Boolean(config.use_class),
    session: Boolean(config.use_session),
    section: Boolean(config.use_section),
  };
  const label = config.labels?.[dimension] || DEFAULT_ACADEMIC_CONFIG.labels[dimension];
  const enabled = flagMap[dimension];
  return {
    enabled,
    locked: !enabled,
    dimension,
    label,
    config,
    message: enabled
      ? null
      : `${label} module is locked because ${dimension} hierarchy is disabled in Education System settings (/staff-panel/system).`,
  };
}

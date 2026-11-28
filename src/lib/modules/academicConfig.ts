import { queryDb } from 'src/lib/database/db';

export type AcademicDimension = 'department' | 'class' | 'session' | 'section';

export const VALID_ACADEMIC_HIERARCHIES = [
  'DEPT_SESSION_SEC',
  'CLASS_SEC',
  'DEPT_CLASS_SEC',
  'CUSTOM',
] as const;

export const VALID_ACADEMIC_DIMENSIONS: AcademicDimension[] = [
  'department',
  'session',
  'class',
  'section',
];

export const DEFAULT_ACADEMIC_LABELS: Record<AcademicDimension, string> = {
  department: 'Department',
  session: 'Academic Year',
  class: 'Class',
  section: 'Section',
};

export const ACADEMIC_HIERARCHY_PRESETS: Record<string, any> = {
  DEPT_SESSION_SEC: {
    primary_col: 'department' as AcademicDimension,
    use_department: true,
    require_department: true,
    use_session: true,
    require_session: true,
    use_class: false,
    require_class: false,
    use_section: true,
    require_section: false,
  },
  CLASS_SEC: {
    primary_col: 'class' as AcademicDimension,
    use_department: false,
    require_department: false,
    use_session: true,
    require_session: true,
    use_class: true,
    require_class: true,
    use_section: true,
    require_section: false,
  },
  DEPT_CLASS_SEC: {
    primary_col: 'department' as AcademicDimension,
    use_department: true,
    require_department: true,
    use_session: true,
    require_session: true,
    use_class: true,
    require_class: true,
    use_section: true,
    require_section: false,
  },
};

export const DEFAULT_ACADEMIC_CONFIG = {
  hierarchy_type: 'CLASS_SEC',
  primary_col: 'class' as AcademicDimension,
  use_department: false,
  use_session: true,
  use_class: true,
  use_section: true,
  require_department: false,
  require_session: true,
  require_class: true,
  require_section: false,
  labels: { ...DEFAULT_ACADEMIC_LABELS },
};

function parseLabels(rawLabels: any) {
  let parsed = rawLabels;
  if (typeof rawLabels === 'string') {
    try {
      parsed = JSON.parse(rawLabels);
    } catch {
      parsed = {};
    }
  }
  const obj = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    department: String(obj.department || DEFAULT_ACADEMIC_LABELS.department).trim() || DEFAULT_ACADEMIC_LABELS.department,
    session: String(obj.session || DEFAULT_ACADEMIC_LABELS.session).trim() || DEFAULT_ACADEMIC_LABELS.session,
    class: String(obj.class || DEFAULT_ACADEMIC_LABELS.class).trim() || DEFAULT_ACADEMIC_LABELS.class,
    section: String(obj.section || DEFAULT_ACADEMIC_LABELS.section).trim() || DEFAULT_ACADEMIC_LABELS.section,
  };
}

export function resolvePrimaryCol(raw: {
  primary_col?: any;
  hierarchy_type?: any;
  use_department?: boolean;
  use_session?: boolean;
  use_class?: boolean;
  use_section?: boolean;
}): AcademicDimension {
  const flags: Record<AcademicDimension, boolean> = {
    department: Boolean(raw.use_department),
    session: Boolean(raw.use_session),
    class: Boolean(raw.use_class),
    section: Boolean(raw.use_section),
  };
  const requested = String(raw.primary_col || '').trim().toLowerCase() as AcademicDimension;
  if (VALID_ACADEMIC_DIMENSIONS.includes(requested) && flags[requested]) {
    return requested;
  }
  const hType = String(raw.hierarchy_type || '').trim().toUpperCase();
  if (hType === 'CLASS_SEC' && flags.class) {
    return 'class';
  }
  const priorityOrder: AcademicDimension[] = ['department', 'class', 'session', 'section'];
  for (const dim of priorityOrder) {
    if (flags[dim]) return dim;
  }
  return 'class';
}

export function buildAcademicConfigPayload(raw: any) {
  const rawType = String(raw?.hierarchy_type || 'CLASS_SEC').trim().toUpperCase();
  const resolvedHierarchy = (VALID_ACADEMIC_HIERARCHIES as readonly string[]).includes(rawType)
    ? rawType
    : 'CLASS_SEC';

  let use_department = Boolean(raw?.use_department);
  let require_department = Boolean(raw?.require_department);
  let use_session = raw?.use_session === undefined ? true : Boolean(raw.use_session);
  let require_session = raw?.require_session === undefined ? true : Boolean(raw.require_session);
  let use_class = raw?.use_class === undefined ? true : Boolean(raw.use_class);
  let require_class = raw?.require_class === undefined ? true : Boolean(raw.require_class);
  let use_section = raw?.use_section === undefined ? true : Boolean(raw.use_section);
  let require_section = Boolean(raw?.require_section);
  let primaryCandidate = raw?.primary_col;

  if (resolvedHierarchy !== 'CUSTOM' && ACADEMIC_HIERARCHY_PRESETS[resolvedHierarchy]) {
    const preset = ACADEMIC_HIERARCHY_PRESETS[resolvedHierarchy];
    use_department = preset.use_department;
    require_department = preset.require_department;
    use_session = preset.use_session;
    require_session = preset.require_session;
    use_class = preset.use_class;
    require_class = preset.require_class;
    use_section = preset.use_section;
    require_section = preset.require_section;
    primaryCandidate = primaryCandidate || preset.primary_col;
  }

  const hasAnyEnabled = use_department || use_session || use_class || use_section;
  if (!hasAnyEnabled) {
    use_class = true;
    require_class = true;
  }

  const primary_col = resolvePrimaryCol({
    primary_col: primaryCandidate,
    hierarchy_type: resolvedHierarchy,
    use_department,
    use_session,
    use_class,
    use_section,
  });

  if (primary_col === 'department') require_department = true;
  if (primary_col === 'session') require_session = true;
  if (primary_col === 'class') require_class = true;
  if (primary_col === 'section') require_section = true;

  return {
    hierarchy_type: resolvedHierarchy,
    primary_col,
    use_department,
    use_session,
    use_class,
    use_section,
    require_department: use_department ? require_department : false,
    require_session: use_session ? require_session : false,
    require_class: use_class ? require_class : false,
    require_section: use_section ? require_section : false,
    labels: parseLabels(raw?.labels),
  };
}

export function normalizeAcademicConfig(raw: any) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ACADEMIC_CONFIG, labels: { ...DEFAULT_ACADEMIC_LABELS } };
  }
  const use_department = Boolean(raw.use_department);
  const use_session = raw.use_session === undefined ? true : Boolean(raw.use_session);
  const use_class = raw.use_class === undefined ? true : Boolean(raw.use_class);
  const use_section = raw.use_section === undefined ? true : Boolean(raw.use_section);
  const primary_col = resolvePrimaryCol({
    primary_col: raw.primary_col,
    hierarchy_type: raw.hierarchy_type,
    use_department,
    use_session,
    use_class,
    use_section,
  });

  return {
    ...raw,
    hierarchy_type: raw.hierarchy_type || 'CLASS_SEC',
    primary_col,
    use_department,
    use_session,
    use_class,
    use_section,
    require_department: use_department ? (Boolean(raw.require_department) || primary_col === 'department') : false,
    require_session: use_session ? (raw.require_session === undefined ? true : Boolean(raw.require_session) || primary_col === 'session') : false,
    require_class: use_class ? (raw.require_class === undefined ? true : Boolean(raw.require_class) || primary_col === 'class') : false,
    require_section: use_section ? (Boolean(raw.require_section) || primary_col === 'section') : false,
    labels: parseLabels(raw.labels),
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
  const label = config.labels?.[dimension] || DEFAULT_ACADEMIC_LABELS[dimension];
  const enabled = flagMap[dimension];
  return {
    enabled,
    locked: !enabled,
    dimension,
    label,
    isPrimary: config.primary_col === dimension,
    config,
    message: enabled
      ? null
      : `${label} module is locked because ${dimension} hierarchy is disabled in Education System settings (/staff-panel/system).`,
  };
}

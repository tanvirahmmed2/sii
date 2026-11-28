export const MODULE_GROUP_SLUGS: Record<string, string[]> = {
  routine: [
    'departments',
    'department-information',
    'department-head',
    'class-information',
    'academic-year',
    'class-setup',
    'class-section',
    'subjects',
    'class-subject',
    'class-routine',
    'class-teacher',
    'class-days',
    'class-periods',
  ],
  departments: ['departments', 'department-information', 'department-head'],
  subjects: ['subjects', 'class-subject'],
  'class-setup': ['class-setup', 'class-information', 'academic-year'],
  'class-section': ['class-section'],
  classes: ['class-setup', 'class-information', 'class-section', 'classrooms'],
  classroom: ['classrooms', 'class-setup'],
  classrooms: ['classrooms'],
  lms: ['classrooms', 'lms-courses'],
  sis: [
    'student-data',
    'student-form-fields',
    'student-registration',
    'student-verify',
    'student-basic-info',
    'student-academic-info',
    'student-address-info',
    'student-guardian-data',
    'student-images',
    'student-general-migration',
    'student-merit-migration',
    'student-delete',
    'student-drop-out',
    'student-exits',
    'student-id-card-templates',
    'student-id-card-download',
    'search-single-student',
    'search-filtered-students',
    'alumni-list',
    'alumni-create',
  ],
  student: ['student-data', 'student-registration', 'student-verify', 'student-basic-info'],
  'student-management': ['student-data', 'student-registration', 'student-verify', 'student-academic-info'],
  admissions: [
    'admission-circulars',
    'admission-form-fields',
    'admission-admit-card-templates',
    'admission-circular-update',
    'admission-applicants',
    'admission-incomplete',
    'admission-exam-marks-upload',
    'admission-exam-marks-process',
    'admission-result',
    'admission-enrollment',
    'admission-spams',
    'admission-spam',
  ],
  attendance: [
    'class-days',
    'class-periods',
    'student-attendance-take',
    'student-attendance-update',
    'student-attendance-leave',
    'student-attendance-devices',
    'student-daily-attendance-report',
    'student-monthly-attendance-report',
    'student-yearly-attendance-report',
    'teacher-class-periods',
    'teacher-attendance-take',
    'teacher-attendance-update',
    'teacher-attendance-leave',
    'teacher-attendance-devices',
    'teacher-daily-attendance-report',
    'teacher-monthly-attendance-report',
    'teacher-yearly-attendance-report',
  ],
  'staff-payroll': [
    'teacher-designations',
    'teacher-registration',
    'teacher-assign',
    'teacher-update',
    'teacher-payroll',
    'teacher-qualifications',
    'teacher-id-card-templates',
    'teacher-id-card-download',
    'teacher-list',
    'teacher-settings',
    'salary-payrolls',
    'salary-teacher',
    'salary-teacher-payments',
    'salary-officers',
    'salary-officer-payments',
    'management-payrolls',
  ],
  teachers: ['teacher-list', 'teacher-registration', 'teacher-assign', 'teacher-update', 'teacher-designations', 'teacher-qualifications'],
  'teacher-management': ['teacher-list', 'teacher-registration', 'teacher-assign', 'teacher-update', 'teacher-payroll'],
  officers: [
    'officer-registration',
    'officer-list',
    'officer-update',
    'officer-payroll',
    'officer-id-card-templates',
    'officer-id-card-download',
    'management-hall',
    'management-library',
    'management-club',
    'management-others',
  ],
  exams: [
    'exam-list',
    'exam-grade',
    'exam-configuration',
    'exam-admit-cards',
    'exam-admit-card-download',
    'exam-mark-input',
    'exam-mark-update',
    'exam-result-list',
    'exam-result-process',
    'exam-result-publish',
    'exam-mark-sheet',
    'exam-mark-sheet-download',
    'exam-attendance-submit',
    'exam-attendance-list',
    'cbt-exams',
  ],
  exam: ['exam-list', 'exam-grade', 'exam-configuration', 'exam-result-list'],
  examination: ['exam-list', 'exam-grade', 'exam-configuration', 'exam-result-list'],
  documents: [
    'tc-templates',
    'tc',
    'testimonial-templates',
    'testimonials',
    'certificate-templates',
    'certificates',
    'payment-receipt-templates',
    'payment-receipt',
    'posters',
    'poster-templates',
  ],
  library: [
    'library-book-category',
    'library-book-writer',
    'library-books',
    'library-books-publishers',
    'library-bookshelf',
    'library-student-issue',
    'library-student-return',
    'library-teacher-issue',
    'library-teacher-return',
  ],
  'management-library': ['library-books', 'library-student-issue', 'management-library'],
  hostel: [
    'residence-list',
    'residence-room',
    'residence-allocations',
    'residence-applicants',
    'residence-report-vacancy',
    'residence-report-fees',
    'residence-report',
    'residence-disallocations',
  ],
  hall: ['residence-list', 'residence-room', 'residence-allocations', 'management-hall'],
  residence: ['residence-list', 'residence-room', 'residence-allocations', 'residence-applicants'],
  notices: ['notices'],
  events: ['events'],
  clubs: [
    'club-category',
    'club-create',
    'club-list',
    'club-moderator',
    'club-members',
    'club-news',
    'club-notices',
    'club-images',
  ],
  'website-builder': [
    'about',
    'institutional',
    'institutional-about',
    'institutional-missions',
    'institutional-visions',
    'institutional-milestones',
    'histories',
    'institutional-infrastructure',
    'campus-data',
    'facilities',
    'board-members',
    'institutional-board-members',
    'news-list',
    'news-create',
    'awards-list',
    'awards-create',
    'events',
    'posters',
    'poster-templates',
    'page-builder',
  ],
  communications: [
    'sms-balance',
    'mail-balance',
    'contacts',
    'message-facebook',
    'message-whatsapp',
    'message-instagram',
  ],
  contacts: ['contacts'],
  fees: [
    'fees-education-configure',
    'fees-education-make',
    'fees-exam',
    'fees-admissions',
    'fees-residence',
    'fees-others',
    'payment-education-list',
    'payment-education-paid',
    'payment-education-unpaid',
    'payment-exam-list',
    'payment-exam-paid',
    'payment-exam-unpaid',
    'payment-residence-list',
    'payment-residence-paid',
    'payment-residence-unpaid',
    'transactions',
    'fee-accounting',
  ],
  fee: ['fees-education-configure', 'fees-education-make', 'payment-education-list'],
  'fees-education': ['fees-education-configure', 'fees-education-make', 'payment-education-list'],
  'education-fee': ['fees-education-configure', 'fees-education-make', 'payment-education-list'],
  accounting: [
    'inventory-list',
    'inventory-new',
    'inventory-supplier',
    'inventory-expenses',
    'inventory-transactions',
    'inventory-unpaid',
    'fee-accounting',
    'transactions',
  ],
  accounts: ['inventory-expenses', 'inventory-transactions', 'fee-accounting', 'transactions'],
  settings: ['system', 'configure-payments', 'configure-meta', 'modules', 'settings'],
};

export const PATH_ALIAS_SLUGS: Record<string, string[]> = {
  '/staff-panel/posters/studio/new': ['posters'],
  '/staff-panel/posters/studio': ['posters'],
  '/staff-panel/admission-spam': ['admission-spams', 'admission-spam'],
  '/staff-panel/admit-card-templets': ['admission-admit-card-templates', 'admit-card-templets'],
  '/staff-panel/admit-card-templates': ['admission-admit-card-templates'],
  '/staff-panel/inverntory-transactions': ['inventory-transactions', 'inverntory-transactions'],
  '/staff-panel/library-studnet-issue': ['library-student-issue', 'library-studnet-issue'],
  '/staff-panel/student-id-card-templets': ['student-id-card-templates', 'student-id-card-templets'],
  '/staff-panel/teahcer-attendance-devices': ['teacher-attendance-devices', 'teahcer-attendance-devices'],
  '/staff-panel/officer-id-card': ['officer-id-card-templates', 'officer-id-card'],
  '/staff-panel/teacher-id-card': ['teacher-id-card-templates', 'teacher-id-card'],
  '/staff-panel/institutional-board-members': ['board-members', 'institutional-board-members'],
  '/staff-panel/about': ['institutional-about', 'about'],
  '/staff-panel/club-images': ['club-list', 'club-images'],
  '/staff-panel/management-payrolls': ['salary-payrolls', 'management-payrolls'],
};

export const ALWAYS_ALLOWED_STAFF_PATHS = new Set<string>([
  '/staff-panel',
  '/staff-panel/staff-profile',
  '/staff-panel/staff-settings',
]);

export function normalizeStaffPath(rawPath: string | null | undefined): string {
  if (!rawPath) return '';
  let clean = String(rawPath).trim().split('?')[0].split('#')[0].replace(/\/+$/, '');
  if (!clean) return '';
  if (!clean.startsWith('/')) clean = `/${clean}`;
  if (clean === '/') return '/staff-panel';
  if (!clean.startsWith('/staff-panel')) {
    clean = `/staff-panel${clean}`;
  }
  return clean.toLowerCase();
}

export function extractSlugFromStaffPath(rawPath: string | null | undefined): string {
  const norm = normalizeStaffPath(rawPath);
  if (!norm || norm === '/staff-panel') return '';
  return norm.replace(/^\/staff-panel\//, '').split('/')[0] || '';
}

export function expandModuleKeys(moduleKeyOrList: string | string[]): string[] {
  const rawList = Array.isArray(moduleKeyOrList) ? moduleKeyOrList : [moduleKeyOrList];
  const expanded = new Set<string>();
  for (const raw of rawList) {
    if (!raw) continue;
    for (const part of String(raw).split(',')) {
      const clean = part.trim().toLowerCase();
      if (!clean) continue;
      expanded.add(clean);
      const groupMembers = MODULE_GROUP_SLUGS[clean];
      if (groupMembers) {
        for (const m of groupMembers) {
          expanded.add(m.toLowerCase());
        }
      }
    }
  }
  return Array.from(expanded);
}

export function hasSlugOrPathInWebsite(
  rawPath: string,
  allowedControlSlugs: string[] = [],
  allowedControlPaths: string[] = [],
  explicitModuleKey?: string | null
): boolean {
  const normPath = normalizeStaffPath(rawPath);
  if (!normPath) return false;
  if (ALWAYS_ALLOWED_STAFF_PATHS.has(normPath)) return true;

  const slugSet = new Set(allowedControlSlugs.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean));
  const pathSet = new Set(allowedControlPaths.map((p) => String(p || '').trim().toLowerCase().replace(/\/+$/, '')).filter(Boolean));

  if (pathSet.has(normPath)) return true;

  const prefixPath = normPath.split('/').slice(0, 3).join('/');
  if (prefixPath && pathSet.has(prefixPath)) return true;

  const pathSlug = extractSlugFromStaffPath(normPath);
  if (pathSlug && slugSet.has(pathSlug)) return true;

  const aliasCandidates = PATH_ALIAS_SLUGS[normPath] || PATH_ALIAS_SLUGS[prefixPath];
  if (aliasCandidates) {
    for (const candidate of aliasCandidates) {
      if (slugSet.has(candidate) || pathSet.has(`/staff-panel/${candidate}`)) {
        return true;
      }
    }
  }

  if (explicitModuleKey && !MODULE_GROUP_SLUGS[String(explicitModuleKey).trim().toLowerCase()]) {
    for (const candidate of expandModuleKeys(explicitModuleKey)) {
      if (slugSet.has(candidate)) return true;
    }
  }

  return false;
}

export function isStaffAuthorizedForNavItem(
  rawPath: string,
  staffAllowedSlugs: string[] = [],
  staffAllowedPaths: string[] = [],
  explicitModuleKey?: string | null
): boolean {
  const normPath = normalizeStaffPath(rawPath);
  if (!normPath) return false;
  if (ALWAYS_ALLOWED_STAFF_PATHS.has(normPath)) return true;

  const staffSlugSet = new Set(staffAllowedSlugs.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean));
  const staffPathSet = new Set(staffAllowedPaths.map((p) => String(p || '').trim().toLowerCase().replace(/\/+$/, '')).filter(Boolean));

  if (staffPathSet.has(normPath)) return true;
  const prefixPath = normPath.split('/').slice(0, 3).join('/');
  if (prefixPath && staffPathSet.has(prefixPath)) return true;

  const pathSlug = extractSlugFromStaffPath(normPath);
  if (pathSlug && staffSlugSet.has(pathSlug)) return true;

  const aliasCandidates = PATH_ALIAS_SLUGS[normPath] || PATH_ALIAS_SLUGS[prefixPath];
  if (aliasCandidates) {
    for (const candidate of aliasCandidates) {
      if (staffSlugSet.has(candidate) || staffPathSet.has(`/staff-panel/${candidate}`)) {
        return true;
      }
    }
  }

  if (explicitModuleKey) {
    const cleanExplicit = String(explicitModuleKey).trim().toLowerCase();
    if (!MODULE_GROUP_SLUGS[cleanExplicit] && staffSlugSet.has(cleanExplicit)) {
      return true;
    }
  }

  return false;
}

export type AcademicDimensionKey = 'department' | 'class' | 'session' | 'section';

const ACADEMIC_DIMENSION_PATHS: Record<string, AcademicDimensionKey> = {
  '/staff-panel/departments': 'department',
  '/staff-panel/department-information': 'department',
  '/staff-panel/department-head': 'department',
  '/staff-panel/class-information': 'class',
  '/staff-panel/class-setup': 'class',
  '/staff-panel/academic-year': 'session',
  '/staff-panel/class-section': 'section',
};

const ACADEMIC_DIMENSION_LABELS: Record<AcademicDimensionKey, string> = {
  department: 'Department',
  class: 'Class',
  session: 'Academic Year',
  section: 'Section',
};

export function getAcademicDimensionForPath(rawPath: string | null | undefined): AcademicDimensionKey | null {
  const normPath = normalizeStaffPath(rawPath);
  if (!normPath) return null;
  if (ACADEMIC_DIMENSION_PATHS[normPath]) {
    return ACADEMIC_DIMENSION_PATHS[normPath];
  }
  const prefixPath = normPath.split('/').slice(0, 3).join('/');
  return ACADEMIC_DIMENSION_PATHS[prefixPath] || null;
}

export function getAcademicDimensionLockInfo(
  rawPath: string | null | undefined,
  academicConfig: any
): { locked: boolean; dimension?: AcademicDimensionKey; label?: string } {
  const dimension = getAcademicDimensionForPath(rawPath);
  if (!dimension) {
    return { locked: false };
  }
  const label = academicConfig?.labels?.[dimension] || ACADEMIC_DIMENSION_LABELS[dimension];
  if (!academicConfig || typeof academicConfig !== 'object') {
    return { locked: false, dimension, label };
  }
  const flagMap: Record<AcademicDimensionKey, boolean> = {
    department: Boolean(academicConfig.use_department),
    class: academicConfig.use_class === undefined ? true : Boolean(academicConfig.use_class),
    session: academicConfig.use_session === undefined ? true : Boolean(academicConfig.use_session),
    section: academicConfig.use_section === undefined ? true : Boolean(academicConfig.use_section),
  };
  return {
    locked: !flagMap[dimension],
    dimension,
    label,
  };
}

export function getStaffModuleAccessLevel(
  rawPath: string | null | undefined,
  staffPermissions: Record<string, any> | null | undefined,
  isOwnerOrBypass = false,
  explicitModuleKey?: string | null
): string {
  if (isOwnerOrBypass) return 'Owner';
  const normPath = normalizeStaffPath(rawPath);
  if (!normPath) return '';
  if (!staffPermissions || typeof staffPermissions !== 'object') {
    return ALWAYS_ALLOWED_STAFF_PATHS.has(normPath) ? 'View' : '';
  }

  const candidateKeys: string[] = [];
  const pathSlug = extractSlugFromStaffPath(normPath);
  if (pathSlug) candidateKeys.push(pathSlug);
  const aliases = PATH_ALIAS_SLUGS[normPath];
  if (aliases) candidateKeys.push(...aliases);
  if (explicitModuleKey) {
    const cleanExplicit = String(explicitModuleKey).trim().toLowerCase();
    if (cleanExplicit && !MODULE_GROUP_SLUGS[cleanExplicit]) {
      candidateKeys.push(cleanExplicit);
    }
  }

  let matchedPerm: any = null;
  for (const key of candidateKeys) {
    if (staffPermissions[key]) {
      matchedPerm = staffPermissions[key];
      break;
    }
  }

  if (!matchedPerm) {
    for (const perm of Object.values(staffPermissions)) {
      if (perm && normalizeStaffPath(perm.module_path) === normPath) {
        matchedPerm = perm;
        break;
      }
    }
  }

  if (!matchedPerm) {
    return ALWAYS_ALLOWED_STAFF_PATHS.has(normPath) ? 'View' : '';
  }
  if (matchedPerm.can_view && matchedPerm.can_create && matchedPerm.can_edit && matchedPerm.can_delete) {
    return '';
  }
  if (matchedPerm.can_edit || matchedPerm.can_create || matchedPerm.can_delete) {
    return 'Edit';
  }
  if (matchedPerm.can_view) {
    return 'View';
  }
  return '';
}

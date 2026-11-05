const fs = require('fs');
const path = require('path');
const { pool, query } = require('./db');

function toTitleCase(slug) {
  return slug
    .split('-')
    .map((w) => {
      const upper = w.toUpperCase();
      if (['SIS', 'LMS', 'CBT', 'TC', 'ID', 'SMS', 'FAQ', 'FAQS', 'PDF', 'QR', 'NID', 'EIIN'].includes(upper)) {
        return upper;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

// Category and metadata resolver for Control Modules
function resolveControlMetadata(slug, panelType = 'staff') {
  const s = slug.toLowerCase();

  // 1. Teacher Panel specific metadata
  if (panelType === 'teacher') {
    const teacherDescriptions = {
      'teacher-dashboard': 'Teacher faculty workstation dashboard, daily routine, and quick actions',
      'teacher-assignments': 'Create, distribute, and grade classroom homework assignments',
      'teacher-attendance': 'Daily student period and classroom attendance marking',
      'teacher-classrooms': 'Virtual lecture rooms, lesson announcements, and student interaction',
      'teacher-clubs': 'Extracurricular student club leadership and moderation',
      'teacher-exams': 'Exam scheduling, question drafting, and paper supervision',
      'teacher-id-card': 'Digital teacher faculty identity card and QR credentials',
      'teacher-leaves': 'Submit and track faculty leave of absence applications',
      'teacher-lessons': 'Syllabus lesson planning, chapter milestones, and teaching notes',
      'teacher-marks': 'Input and review term exam scores and continuous assessments',
      'teacher-materials': 'Upload lecture slides, reading PDFs, and reference resources',
      'teacher-profile': 'Personal faculty credentials, subject assignments, and bio',
      'teacher-salary': 'View monthly salary statements, allowances, and pay slips',
      'teacher-schedule': 'Weekly timetable matrix, periods, and room assignments',
      'teacher-subjects': 'Curriculum syllabus and enrolled student lists for taught subjects',
    };

    const cleanName = slug.replace(/^teacher-?/, '').trim() || 'Dashboard';
    const name = `Teacher ${toTitleCase(cleanName)}`;
    return {
      name,
      category: 'Teacher Panel',
      icon: 'BiUserCheck',
      description: teacherDescriptions[slug] || `Teacher workstation for ${toTitleCase(cleanName).toLowerCase()}`,
    };
  }

  // 2. Student Panel specific metadata
  if (panelType === 'student') {
    const studentDescriptions = {
      'student-dashboard': "Student personal portal overview, today's schedule, and announcements",
      'student-assignments': 'View assigned tasks, submit coursework, and check teacher feedback',
      'student-attendance': 'Personal daily presence, absence logs, and attendance percentages',
      'student-cards': 'Download term exam admit cards, seat roll, and hall instructions',
      'student-certificates': 'Digital academic achievement certificates and diplomas',
      'student-classrooms': 'Access subject classrooms, lesson notes, and live lectures',
      'student-clubs': 'Explore and join institutional science, sports, and cultural clubs',
      'student-events': 'Upcoming school celebrations, sports day, and academic events',
      'student-exams': 'Take scheduled computer-based tests, quizzes, and view exam instructions',
      'student-fees': 'Review fee invoices, dues breakdown, and pay tuition fees online',
      'student-id-card': 'Official student digital identification card with verification QR',
      'student-materials': 'Download lesson slides, practice sheets, and reference books',
      'student-profile': 'Personal bio, guardian contact details, and enrollment info',
      'student-receipts': 'Print money receipts and payment transaction records',
      'student-residence': 'Dormitory room allocation, hostel dues, and dining details',
      'student-results': 'View GPA, CGPA, subject-wise marks, and term grade sheets',
      'student-routine': 'Personal weekly class schedule, room numbers, and teachers',
      'student-subjects': 'List of compulsory and elective/4th subjects with syllabus',
      'student-tc': 'Apply for clearance, institutional migration, and track TC status',
      'student-testimonial': 'Official institutional testimonial and conduct certificates',
    };

    const cleanName = slug.replace(/^student-?/, '').trim() || 'Dashboard';
    const name = `Student ${toTitleCase(cleanName)}`;
    return {
      name,
      category: 'Student Panel',
      icon: 'BiUser',
      description: studentDescriptions[slug] || `Student portal for ${toTitleCase(cleanName).toLowerCase()}`,
    };
  }

  // 3. Officer Panel specific metadata
  if (panelType === 'officer') {
    const officerDescriptions = {
      'officer-dashboard': 'Administrative officer workstation and departmental overview',
      'officer-club': 'Club approvals, event coordination, and officer supervision',
      'officer-events': 'Campus event scheduling, guest permits, and coordination',
      'officer-id-card': 'Officer and staff institutional identity card printing',
      'officer-library': 'Library shelves, book catalog, and circulation ledger',
      'officer-profile': 'Designation credentials, department, and officer preferences',
      'officer-residential': 'Staff and officer residential quarter allocations',
      'officer-settings': 'Administrative officer workstation preferences',
    };

    const cleanName = slug.replace(/^officer-?/, '').trim() || 'Dashboard';
    const name = `Officer ${toTitleCase(cleanName)}`;
    return {
      name,
      category: 'Officer Panel',
      icon: 'BiShieldQuarter',
      description: officerDescriptions[slug] || `Officer workstation for ${toTitleCase(cleanName).toLowerCase()}`,
    };
  }

  // 4. Staff Panel specific metadata
  let category = 'General Management';
  let icon = 'BiGridAlt';

  if (s.includes('student') || s.includes('admit-card') || s.includes('testimonial') || s.includes('id-card') || s.includes('transfer-certificate') || s.includes('alumni')) {
    category = 'Student Information';
    icon = 'BiUser';
  } else if (s.includes('admission') || s.includes('applicant')) {
    category = 'Admissions & Enrollment';
    icon = 'BiUserPlus';
  } else if (s.includes('exam') || s.includes('grade') || s.includes('mark') || s.includes('result') || s.includes('question') || s.includes('cbt')) {
    category = 'Examinations & Grading';
    icon = 'BiAward';
  } else if (s.includes('fee') || s.includes('pay') || s.includes('invoice') || s.includes('accounting') || s.includes('voucher') || s.includes('ledger') || s.includes('wallet') || s.includes('refund')) {
    category = 'Fees & Accounting';
    icon = 'BiCreditCard';
  } else if (s.includes('teacher') || s.includes('faculty')) {
    category = 'Teacher Management';
    icon = 'BiUserCheck';
  } else if (s.includes('officer') || s.includes('designation')) {
    category = 'Officer Administration';
    icon = 'BiShieldQuarter';
  } else if (s.includes('salary') || s.includes('payroll') || s.includes('payscale') || s.includes('pay-scale')) {
    category = 'Payroll & Salaries';
    icon = 'BiLineChart';
  } else if (s.includes('routine') || s.includes('class-') || s.includes('department') || s.includes('subject') || s.includes('academic-year') || s.includes('section')) {
    category = 'Class & Routine';
    icon = 'BiTime';
  } else if (s.includes('library') || s.includes('book')) {
    category = 'Library & Circulation';
    icon = 'BiBookBookmark';
  } else if (s.includes('hostel') || s.includes('dormitory') || s.includes('hall')) {
    category = 'Hostel & Dormitory';
    icon = 'BiBuilding';
  } else if (s.includes('transport') || s.includes('vehicle') || s.includes('bus') || s.includes('route')) {
    category = 'Parent Portal & Transport';
    icon = 'BiBus';
  } else if (s.includes('club')) {
    category = 'Clubs & Activities';
    icon = 'BiCompass';
  } else if (s.includes('template') || s.includes('poster') || s.includes('document') || s.includes('certificate')) {
    category = 'Documents & Templates';
    icon = 'BiFile';
  } else if (s.includes('inventory') || s.includes('asset') || s.includes('stock')) {
    category = 'Parent Portal & Transport';
    icon = 'BiPackage';
  } else if (s.includes('mailer') || s.includes('sms') || s.includes('meta') || s.includes('communication') || s.includes('broadcast')) {
    category = 'Communications & Gateways';
    icon = 'BiMessageRoundedDots';
  } else if (s.includes('notice') || s.includes('news') || s.includes('event') || s.includes('award') || s.includes('about') || s.includes('faq') || s.includes('gallery') || s.includes('facility') || s.includes('collaboration') || s.includes('history') || s.includes('mission') || s.includes('vision') || s.includes('policy')) {
    category = 'Institutional CMS';
    icon = 'BiDesktop';
  } else if (s.includes('lms') || s.includes('course') || s.includes('lesson') || s.includes('live-class') || s.includes('classroom') || s.includes('video-asset')) {
    category = 'True LMS & Live Classes';
    icon = 'BiVideo';
  } else if (s.includes('theme') || s.includes('page-builder') || s.includes('global-block') || s.includes('media-file') || s.includes('menu')) {
    category = 'Page Builder & CMS';
    icon = 'BiPalette';
  } else if (s.includes('domain') || s.includes('quota') || s.includes('storage') || s.includes('feature-flag') || s.includes('tenant')) {
    category = 'Tenant Routing & Storage';
    icon = 'BiServer';
  } else if (s.includes('audit') || s.includes('log') || s.includes('security') || s.includes('api-key') || s.includes('webhook') || s.includes('job')) {
    category = 'Security & Audit Logs';
    icon = 'BiShield';
  } else if (s.includes('parent') || s.includes('guardian')) {
    category = 'Parent Portal & Transport';
    icon = 'BiGroup';
  } else if (s.includes('progression') || s.includes('promotion') || s.includes('biometric') || s.includes('attendance-device')) {
    category = 'Academic Progression';
    icon = 'BiTrendingUp';
  } else if (s.includes('staff') || s.includes('setting') || s.includes('preference') || s.includes('config') || s.includes('module')) {
    category = 'Staff & System Settings';
    icon = 'BiCog';
  }

  const customDescriptions = {
    'admission-applicants': 'Review and verify prospective student online admission applications',
    'admission-circulars': 'Create and manage seasonal student admission circulars and intake quotas',
    'admission-exams': 'Schedule admission entrance tests, question formats, and roll allocations',
    'admission-results': 'Publish entrance test results, merit lists, and waiting list candidates',
    'student-registration': 'Enroll verified students into official classes, sections, and academic sessions',
    'student-data': 'Master student directory with personal, guardian, and demographic records',
    'student-verify': 'Perform physical and digital identity verification for newly enrolled students',
    'exam-mark-input': 'Direct teacher mark entry portal for class tests, midterms, and finals',
    'exam-results': 'Automated GPA, CGPA, and letter grade calculation with report card generation',
    'student-invoices': 'Generate and disburse student tuition and term billing fee invoices',
    'fee-collection': 'Process counter payments, receipt vouchers, and online digital checkout collections',
    'classrooms': 'Digital LMS classrooms with lecture notes, assignments, and study materials',
    'class-routine': 'Manage dynamic weekly timetable matrix across classrooms, days, and periods',
    'tenant-quotas': 'Monitor domain routing (*.edu.bd), cloud storage quotas, and feature flags',
    'lms-courses': 'Design structured learning courses with modules, lessons, and video streams',
    'modules': 'Comprehensive catalog of public home modules and administrative control workstations',
  };

  const name = toTitleCase(slug);
  const description = customDescriptions[slug] || `Administrative workstation for ${name.toLowerCase()}`;

  return { name, category, icon, description };
}

async function seedControlModules() {
  console.log('\n======================================================');
  console.log('5. SEEDING WEBSITE CONTROL MODULES');
  console.log('   (Control Panel, Teacher Panel, Student Panel & Officer Panel)');
  console.log('======================================================');

  const allModulesToInsert = [];

  // 1. Staff Panel Workstations from [domain]/(staffs)/staff-panel/*
  const staffPanelDir = path.resolve(process.cwd(), 'src/app/[domain]/(staffs)/staff-panel');
  if (fs.existsSync(staffPanelDir)) {
    const entries = fs.readdirSync(staffPanelDir, { withFileTypes: true });
    const subDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const staffSlugs = Array.from(new Set([...subDirs, 'modules'])).sort();

    for (const slug of staffSlugs) {
      const meta = resolveControlMetadata(slug, 'staff');
      allModulesToInsert.push({
        slug,
        name: meta.name,
        path: `/staff-panel/${slug}`,
        category: meta.category,
        description: meta.description,
        icon: meta.icon,
      });
    }
    console.log(`-> Discovered ${staffSlugs.length} staff panel modules from (staffs)/staff-panel/*`);
  }

  // 2. Teacher Panel Modules from [domain]/(teacher)/teacher/*
  const teacherDir = path.resolve(process.cwd(), 'src/app/[domain]/(teacher)/teacher');
  if (fs.existsSync(teacherDir)) {
    // Root dashboard: /teacher
    allModulesToInsert.push({
      slug: 'teacher-dashboard',
      ...resolveControlMetadata('teacher-dashboard', 'teacher'),
      path: '/teacher',
    });

    const entries = fs.readdirSync(teacherDir, { withFileTypes: true });
    const teacherSubDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('['))
      .map((e) => e.name);

    for (const sub of teacherSubDirs) {
      const slug = `teacher-${sub}`;
      const meta = resolveControlMetadata(slug, 'teacher');
      allModulesToInsert.push({
        slug,
        name: meta.name,
        path: `/teacher/${sub}`,
        category: meta.category,
        description: meta.description,
        icon: meta.icon,
      });
    }
    console.log(`-> Discovered ${teacherSubDirs.length + 1} teacher panel modules from (teacher)/teacher/*`);
  }

  // 3. Student Panel Modules from [domain]/(student)/student/*
  const studentDir = path.resolve(process.cwd(), 'src/app/[domain]/(student)/student');
  if (fs.existsSync(studentDir)) {
    // Root dashboard: /student
    allModulesToInsert.push({
      slug: 'student-dashboard',
      ...resolveControlMetadata('student-dashboard', 'student'),
      path: '/student',
    });

    const entries = fs.readdirSync(studentDir, { withFileTypes: true });
    const studentSubDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('['))
      .map((e) => e.name);

    for (const sub of studentSubDirs) {
      const slug = `student-${sub}`;
      const meta = resolveControlMetadata(slug, 'student');
      allModulesToInsert.push({
        slug,
        name: meta.name,
        path: `/student/${sub}`,
        category: meta.category,
        description: meta.description,
        icon: meta.icon,
      });
    }
    console.log(`-> Discovered ${studentSubDirs.length + 1} student panel modules from (student)/student/*`);
  }

  // 4. Officer Panel Modules from [domain]/(officer)/officer/*
  const officerDir = path.resolve(process.cwd(), 'src/app/[domain]/(officer)/officer');
  if (fs.existsSync(officerDir)) {
    // Root dashboard: /officer
    allModulesToInsert.push({
      slug: 'officer-dashboard',
      ...resolveControlMetadata('officer-dashboard', 'officer'),
      path: '/officer',
    });

    const entries = fs.readdirSync(officerDir, { withFileTypes: true });
    const officerSubDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('['))
      .map((e) => e.name);

    for (const sub of officerSubDirs) {
      const slug = `officer-${sub}`;
      const meta = resolveControlMetadata(slug, 'officer');
      allModulesToInsert.push({
        slug,
        name: meta.name,
        path: `/officer/${sub}`,
        category: meta.category,
        description: meta.description,
        icon: meta.icon,
      });
    }
    console.log(`-> Discovered ${officerSubDirs.length + 1} officer panel modules from (officer)/officer/*`);
  }

  console.log(`-> Total control modules to insert/update: ${allModulesToInsert.length}`);

  let count = 0;
  for (let i = 0; i < allModulesToInsert.length; i++) {
    const mod = allModulesToInsert[i];

    await query(
      `INSERT INTO website_control_modules (
         name, slug, path, category, description, icon, is_active, display_order, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         path = EXCLUDED.path,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         display_order = EXCLUDED.display_order,
         updated_at = CURRENT_TIMESTAMP`,
      [mod.name, mod.slug, mod.path, mod.category, mod.description, mod.icon, i + 1]
    );

    count++;
  }

  const res = await query('SELECT count(*)::int AS count FROM website_control_modules');
  const total = res.rows[0]?.count || count;
  console.log(`✓ Inserted/updated ${count} control modules in "website_control_modules" (Total in DB: ${total}).`);

  return {
    success: true,
    control_modules_seeded: count,
    total_in_db: total,
  };
}

if (require.main === module) {
  seedControlModules()
    .then((res) => {
      console.log('\nWebsite control modules successfully seeded!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error seeding control modules:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  seedControlModules,
  resolveControlMetadata,
};

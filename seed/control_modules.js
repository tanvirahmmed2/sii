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
function resolveControlMetadata(slug) {
  const s = slug.toLowerCase();
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

  // Specialized descriptions for core school operations
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
  console.log('5. SEEDING WEBSITE CONTROL MODULES (Staff Workstations)');
  console.log('======================================================');

  const staffPanelDir = path.resolve(process.cwd(), 'src/app/[domain]/(staffs)/staff-panel');
  if (!fs.existsSync(staffPanelDir)) {
    throw new Error(`staff-panel directory not found at: ${staffPanelDir}`);
  }

  const entries = fs.readdirSync(staffPanelDir, { withFileTypes: true });
  const subDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  // Ensure 'modules' is included if directory exists or as administrative workstation
  const controlSlugs = Array.from(new Set([...subDirs, 'modules'])).sort();
  console.log(`-> Discovered ${controlSlugs.length} staff panel control modules from [domain]/(staffs)/staff-panel/*`);

  let count = 0;
  for (let i = 0; i < controlSlugs.length; i++) {
    const slug = controlSlugs[i];
    const meta = resolveControlMetadata(slug);
    const itemPath = `/staff-panel/${slug}`;

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
      [meta.name, slug, itemPath, meta.category, meta.description, meta.icon, i + 1]
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


const { pool, query } = require('./db');

const SEED_PACKAGES = [
  {
    name: 'Starter Academy',
    slug: 'starter-academy',
    short_description: 'Essential student records, public school portal, class routine, and counter tuition fees collection.',
    description: 'Designed for primary schools, coaching centers, and emerging private academies getting started with digital automation.',
    monthly_price_usd: 19.00,
    yearly_price_usd: 190.00,
    monthly_price_bdt: 2200.00,
    yearly_price_bdt: 22000.00,
    monthly_price: 19.00,
    yearly_price: 190.00,
    discount_percentage: 15.00,
    max_students: 500,
    max_teachers: 30,
    max_staff: 15,
    max_storage_mb: 5120,
    monthly_mail: 1000,
    monthly_sms: 200,
    is_available_student_panel: true,
    is_available_teacher_panel: true,
    is_available_custom_domain: false,
    grace_period: 3,
    sort_order: 1,
    is_popular: false,
    is_public: true,
    is_active: true,
    include_all_home: false,
    include_all_control: false,
  },
  {
    name: 'Pro School & Campus',
    slug: 'pro-school-campus',
    short_description: 'Full school ERP with CBT exams, online payment gateways, report cards, hostel, and digital library.',
    description: 'Comprehensive academic workstation suite for high schools, colleges, and madrasahs requiring automated marksheets and online fee gateways.',
    monthly_price_usd: 49.00,
    yearly_price_usd: 490.00,
    monthly_price_bdt: 5800.00,
    yearly_price_bdt: 58000.00,
    monthly_price: 49.00,
    yearly_price: 490.00,
    discount_percentage: 20.00,
    max_students: 2500,
    max_teachers: 100,
    max_staff: 50,
    max_storage_mb: 20480,
    monthly_mail: 5000,
    monthly_sms: 1000,
    is_available_student_panel: true,
    is_available_teacher_panel: true,
    is_available_custom_domain: true,
    grace_period: 5,
    sort_order: 2,
    is_popular: true,
    is_public: true,
    is_active: true,
    include_all_home: true,
    include_all_control: false,
  },
  {
    name: 'Enterprise University Chain',
    slug: 'enterprise-university-chain',
    short_description: 'Unlimited capacity multi-campus suite with True LMS, live classes, biometric hardware sync, and custom domains (*.edu.bd).',
    description: 'Mission-critical institutional infrastructure with multi-campus routing, double-entry financial ledger, video streaming LMS, and dedicated SLA.',
    monthly_price_usd: 99.00,
    yearly_price_usd: 990.00,
    monthly_price_bdt: 11800.00,
    yearly_price_bdt: 118000.00,
    monthly_price: 99.00,
    yearly_price: 990.00,
    discount_percentage: 25.00,
    max_students: 15000,
    max_teachers: 500,
    max_staff: 200,
    max_storage_mb: 102400,
    monthly_mail: 25000,
    monthly_sms: 5000,
    is_available_student_panel: true,
    is_available_teacher_panel: true,
    is_available_custom_domain: true,
    grace_period: 7,
    sort_order: 3,
    is_popular: false,
    is_public: true,
    is_active: true,
    include_all_home: true,
    include_all_control: true,
  },
];

async function seedPackages() {
  console.log('\n======================================================');
  console.log('6. SEEDING PACKAGES & LINKING HOME / CONTROL MODULES');
  console.log('======================================================');

  // Fetch all available Home and Control modules
  const [homeModsRes, ctrlModsRes] = await Promise.all([
    query('SELECT id, slug FROM website_home_modules ORDER BY display_order ASC, id ASC'),
    query('SELECT id, slug, category FROM website_control_modules ORDER BY category ASC, id ASC'),
  ]);

  const allHomeMods = homeModsRes.rows || [];
  const allCtrlMods = ctrlModsRes.rows || [];

  console.log(`-> Loaded ${allHomeMods.length} home modules and ${allCtrlMods.length} control modules for package allocation.`);

  let seededCount = 0;
  for (const pkg of SEED_PACKAGES) {
    const pkgRes = await query(
      `INSERT INTO packages (
         name, slug, short_description, description,
         monthly_price_usd, yearly_price_usd, monthly_price_bdt, yearly_price_bdt,
         monthly_price, yearly_price, discount_percentage,
         max_students, max_teachers, max_staff, max_storage_mb,
         is_available_student_panel, is_available_teacher_panel, is_available_custom_domain,
         grace_period, sort_order, is_popular, is_public, is_active,
         monthly_mail, monthly_sms, updated_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, $8,
         $9, $10, $11,
         $12, $13, $14, $15,
         $16, $17, $18,
         $19, $20, $21, $22, $23,
         $24, $25, CURRENT_TIMESTAMP
       )
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         short_description = EXCLUDED.short_description,
         description = EXCLUDED.description,
         monthly_price_usd = EXCLUDED.monthly_price_usd,
         yearly_price_usd = EXCLUDED.yearly_price_usd,
         monthly_price_bdt = EXCLUDED.monthly_price_bdt,
         yearly_price_bdt = EXCLUDED.yearly_price_bdt,
         monthly_price = EXCLUDED.monthly_price,
         yearly_price = EXCLUDED.yearly_price,
         discount_percentage = EXCLUDED.discount_percentage,
         max_students = EXCLUDED.max_students,
         max_teachers = EXCLUDED.max_teachers,
         max_staff = EXCLUDED.max_staff,
         max_storage_mb = EXCLUDED.max_storage_mb,
         is_available_student_panel = EXCLUDED.is_available_student_panel,
         is_available_teacher_panel = EXCLUDED.is_available_teacher_panel,
         is_available_custom_domain = EXCLUDED.is_available_custom_domain,
         grace_period = EXCLUDED.grace_period,
         sort_order = EXCLUDED.sort_order,
         is_popular = EXCLUDED.is_popular,
         is_public = EXCLUDED.is_public,
         is_active = EXCLUDED.is_active,
         monthly_mail = EXCLUDED.monthly_mail,
         monthly_sms = EXCLUDED.monthly_sms,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, name, slug`,
      [
        pkg.name, pkg.slug, pkg.short_description, pkg.description,
        pkg.monthly_price_usd, pkg.yearly_price_usd, pkg.monthly_price_bdt, pkg.yearly_price_bdt,
        pkg.monthly_price, pkg.yearly_price, pkg.discount_percentage,
        pkg.max_students, pkg.max_teachers, pkg.max_staff, pkg.max_storage_mb,
        pkg.is_available_student_panel, pkg.is_available_teacher_panel, pkg.is_available_custom_domain,
        pkg.grace_period, pkg.sort_order, pkg.is_popular, pkg.is_public, pkg.is_active,
        pkg.monthly_mail, pkg.monthly_sms
      ]
    );

    const packageId = pkgRes.rows[0].id;

    // 1. Link Home Modules to package_home_modules
    let homeToLink = [];
    if (pkg.include_all_home) {
      homeToLink = allHomeMods;
    } else {
      // Basic starter home pages
      const starterSlugs = ['home', 'about', 'admission', 'contact', 'notices', 'policies', 'results', 'teachers', 'verify-student'];
      homeToLink = allHomeMods.filter((m) => starterSlugs.includes(m.slug));
    }

    for (const hm of homeToLink) {
      await query(
        `INSERT INTO package_home_modules (package_id, home_module_id)
         VALUES ($1, $2)
         ON CONFLICT (package_id, home_module_id) DO NOTHING`,
        [packageId, hm.id]
      );
    }

    // 2. Link Control Modules to package_control_modules (Staff, Teacher, Student, Officer)
    let ctrlToLink = [];
    if (pkg.include_all_control) {
      ctrlToLink = allCtrlMods;
    } else if (pkg.slug === 'pro-school-campus') {
      // Pro gets all categories except advanced enterprise true LMS / biometric hardware / audit internals
      ctrlToLink = allCtrlMods.filter((m) =>
        !['True LMS & Live Classes', 'Academic Progression', 'Security & Audit Logs'].includes(m.category)
      );
    } else {
      // Starter gets core SIS, Class Routine, counter fees, staff settings, plus Teacher & Student panels
      const allowedCategories = ['Student Information', 'Class & Routine', 'Fees & Accounting', 'Staff & System Settings'];
      if (pkg.is_available_teacher_panel) allowedCategories.push('Teacher Panel');
      if (pkg.is_available_student_panel) allowedCategories.push('Student Panel');
      ctrlToLink = allCtrlMods.filter((m) => allowedCategories.includes(m.category));
    }

    for (const cm of ctrlToLink) {
      await query(
        `INSERT INTO package_control_modules (package_id, control_module_id)
         VALUES ($1, $2)
         ON CONFLICT (package_id, control_module_id) DO NOTHING`,
        [packageId, cm.id]
      );
    }

    console.log(`✓ Package "${pkg.name}" configured: linked ${homeToLink.length} home modules and ${ctrlToLink.length} control modules.`);
    seededCount++;
  }

  return {
    success: true,
    packages_seeded: seededCount,
  };
}

if (require.main === module) {
  seedPackages()
    .then((res) => {
      console.log('\nPackages successfully seeded!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error seeding packages:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  seedPackages,
  SEED_PACKAGES,
};

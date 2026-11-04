const fs = require('fs');
const path = require('path');
const { pool, query } = require('./db');

function toTitleCase(slug) {
  return slug
    .split('-')
    .map((w) => {
      const upper = w.toUpperCase();
      if (['TC', 'ID', 'FAQ', 'FAQS', 'PDF', 'QR', 'NID', 'EIIN'].includes(upper)) {
        return upper;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

// Category & metadata mapping for Public Website Home Modules
const HOME_META_MAP = {
  home: { name: 'Home Landing Page', path: '/', category: 'Core', description: 'Institutional public front page, hero showcase, statistics, and quick navigation', icon: 'BiHome' },
  about: { name: 'About Institution', category: 'Academic', description: 'School history, core values, mission, vision, leadership, and campus background', icon: 'BiInfoCircle' },
  admission: { name: 'Online Admissions', category: 'Admissions', description: 'Admission circulars, applicant requirements, registration procedures, and merit results', icon: 'BiUserPlus' },
  alumni: { name: 'Alumni Association', category: 'Academic', description: 'Graduated students association, alumni directory, success stories, and alumni registrations', icon: 'BiGraduation' },
  awards: { name: 'Awards & Honors', category: 'Media', description: 'Academic honors, national achievements, sports accolades, and competition trophies', icon: 'BiAward' },
  classes: { name: 'Academic Classes', category: 'Academic', description: 'Offered curriculum grades, academic class structures, section details, and course overviews', icon: 'BiBookOpen' },
  'club-news': { name: 'Club Announcements', category: 'Media', description: 'Campus extracurricular club bulletins, student organization updates, and activity feeds', icon: 'BiNews' },
  clubs: { name: 'Campus Clubs', category: 'Academic', description: 'Science, debate, cultural, robotics, and sports club member rosters and executive councils', icon: 'BiCompass' },
  collaborations: { name: 'Collaborations & Partners', category: 'Academic', description: 'Academic partnerships, institutional affiliations, university linkages, and MoUs', icon: 'BiNetworkChart' },
  contact: { name: 'Contact & Location', category: 'General', description: 'Campus location map, inquiry form, institutional phone contacts, and physical address', icon: 'BiPhone' },
  departments: { name: 'Academic Departments', category: 'Academic', description: 'Faculty departments, subjects offered, head of departments, and syllabi guidelines', icon: 'BiBuilding' },
  events: { name: 'Campus Events', category: 'Media', description: 'Annual sports, science fairs, cultural festivals, academic seminars, and event calendar', icon: 'BiCalendarEvent' },
  facilities: { name: 'Campus Facilities', category: 'Campus', description: 'Modern laboratories, library halls, computer rooms, auditorium, sports playgrounds, and hostels', icon: 'BiBuildingHouse' },
  faqs: { name: 'Frequently Asked Questions', category: 'General', description: 'Parent and applicant common questions regarding enrollment, exams, campus life, and rules', icon: 'BiHelpCircle' },
  gallery: { name: 'Photo & Video Gallery', category: 'Media', description: 'High-resolution campus photo albums, historical archives, and event coverage', icon: 'BiImages' },
  news: { name: 'School News & Press', category: 'Media', description: 'Official campus press releases, institutional highlights, and daily campus journals', icon: 'BiNews' },
  notices: { name: 'Public Notice Board', category: 'Media', description: 'Digital official notice board, exam timetables, holiday schedules, and emergency circulars', icon: 'BiBell' },
  pay: { name: 'Quick Online Pay', category: 'Finance', description: 'Instant online student tuition and admission fees checkout via bKash, Nagad, and Cards', icon: 'BiCreditCard' },
  policies: { name: 'Institutional Policies', category: 'General', description: 'Student code of conduct, campus ethics, anti-ragging policies, and academic rules', icon: 'BiFileBlank' },
  results: { name: 'Public Exam Results', category: 'Academic', description: 'Term exam merit lists, public board examination statistics, and candidate scorecards', icon: 'BiFileText' },
  'student-fees': { name: 'Fee Structures & Dues', category: 'Finance', description: 'Transparent breakdown of tuition, lab fees, session charges, and payment guidelines', icon: 'BiMoney' },
  teachers: { name: 'Faculty Directory', category: 'Academic', description: 'Comprehensive directory of faculty members, academic qualifications, and departments', icon: 'BiGroup' },
  'verify-id-card': { name: 'Verify Student & Staff ID', category: 'Verification', description: 'Public QR verification portal for valid student and faculty identity cards', icon: 'BiCheckShield' },
  'verify-student': { name: 'Verify Student Enrollment', category: 'Verification', description: 'Instant student enrollment validity and active enrollment status checker', icon: 'BiCheckCircle' },
  'verify-tc': { name: 'Verify Transfer Certificate (TC)', category: 'Verification', description: 'Official authentication portal for school issued student Transfer Certificates', icon: 'BiFileFind' },
  'verify-testimonial': { name: 'Verify Character Testimonial', category: 'Verification', description: 'Official certificate verification for academic character and completion testimonials', icon: 'BiCertification' },
};

async function seedHomeModules() {
  console.log('\n======================================================');
  console.log('4. SEEDING WEBSITE HOME MODULES (Public Frontend)');
  console.log('======================================================');

  const homeDir = path.resolve(process.cwd(), 'src/app/[domain]/(home)');
  if (!fs.existsSync(homeDir)) {
    throw new Error(`(home) directory not found at: ${homeDir}`);
  }

  const entries = fs.readdirSync(homeDir, { withFileTypes: true });
  const subDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  // Build complete list including the root "/" landing page
  const homeSlugs = ['home', ...subDirs.filter((s) => s !== 'home')];
  console.log(`-> Discovered ${homeSlugs.length} public frontend home modules from [domain]/(home)/*`);

  let count = 0;
  for (let i = 0; i < homeSlugs.length; i++) {
    const slug = homeSlugs[i];
    const meta = HOME_META_MAP[slug] || {
      name: toTitleCase(slug),
      category: 'General',
      description: `Public institutional portal feature for ${toTitleCase(slug)}`,
      icon: 'BiGridAlt',
      path: `/${slug}`,
    };

    const itemPath = meta.path || (slug === 'home' ? '/' : `/${slug}`);

    await query(
      `INSERT INTO website_home_modules (
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

  const res = await query('SELECT count(*)::int AS count FROM website_home_modules');
  const total = res.rows[0]?.count || count;
  console.log(`✓ Inserted/updated ${count} public home modules in "website_home_modules" (Total in DB: ${total}).`);

  return {
    success: true,
    home_modules_seeded: count,
    total_in_db: total,
  };
}

if (require.main === module) {
  seedHomeModules()
    .then((res) => {
      console.log('\nWebsite home modules successfully seeded!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error seeding home modules:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  seedHomeModules,
  HOME_META_MAP,
};


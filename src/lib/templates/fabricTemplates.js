// Fabric.js canvas JSON models for each document task
// Standard canvas scales:
// ID Card: 600px x 380px (Standard CR80 86mm x 54mm)
// A4 Portrait: 600px x 848px (210mm x 297mm)
// A4 Landscape: 848px x 600px (297mm x 210mm)

// Patch Fabric.js 5.x bug where fabric.util.stylesToArray fails on undefined styles
export function patchFabric(fabric) {
  if (!fabric) return;
  if (fabric.util) {
    if (fabric.util.stylesToArray && !fabric.util._stylesToArrayPatched) {
      const origStylesToArray = fabric.util.stylesToArray;
      fabric.util.stylesToArray = function(styles, text) {
        if (!styles || typeof styles !== 'object') return [];
        return origStylesToArray.call(this, styles, text);
      };
      fabric.util._stylesToArrayPatched = true;
    }
    if (fabric.util.stylesFromArray && !fabric.util._stylesFromArrayPatched) {
      const origStylesFromArray = fabric.util.stylesFromArray;
      fabric.util.stylesFromArray = function(styles, text) {
        if (!styles) return {};
        return origStylesFromArray.call(this, styles, text);
      };
      fabric.util._stylesFromArrayPatched = true;
    }
  }
}

export const TASK_CONFIGS = {
  student_id: {
    key: 'student_id',
    name: 'Student ID Card',
    slug: 'student-id-card',
    systemTable: 'system_student_id_templates',
    websiteTable: 'website_student_id_templates',
    width: 600,
    height: 380,
    dimension_width: 86.00,
    dimension_height: 54.00,
    dimension_unit: 'mm',
    hasBackSide: true,
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Tanvir Ahmmed' },
      { tag: '{{roll_no}}', label: 'Roll Number', sample: '101' },
      { tag: '{{registration_no}}', label: 'Reg No', sample: 'REG-2026-904' },
      { tag: '{{class_name}}', label: 'Class / Grade', sample: 'Class 10' },
      { tag: '{{section_name}}', label: 'Section', sample: 'Science-A' },
      { tag: '{{blood_group}}', label: 'Blood Group', sample: 'O+' },
      { tag: '{{emergency_contact}}', label: 'Emergency Contact', sample: '+880 1700-000000' },
      { tag: '{{student_photo}}', label: 'Student Photo', sample: '/default-avatar.png' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{card_number}}', label: 'Card Serial', sample: 'STU-2026-00109' },
      { tag: '{{expiry_date}}', label: 'Expiry Date', sample: '31 Dec 2027' },
      { tag: '{{barcode}}', label: 'Barcode Code', sample: '*STU202600109*' },
    ]
  },
  teacher_id: {
    key: 'teacher_id',
    name: 'Teacher / Faculty ID Card',
    slug: 'teacher-id-card',
    systemTable: 'system_teacher_id_templates',
    websiteTable: 'website_teacher_id_templates',
    width: 600,
    height: 380,
    dimension_width: 86.00,
    dimension_height: 54.00,
    dimension_unit: 'mm',
    hasBackSide: true,
    mergeTags: [
      { tag: '{{teacher_name}}', label: 'Faculty Name', sample: 'Dr. Michael Vance' },
      { tag: '{{designation}}', label: 'Designation', sample: 'Senior Lecturer' },
      { tag: '{{department}}', label: 'Department', sample: 'Computer Science' },
      { tag: '{{teacher_id}}', label: 'Employee ID', sample: 'FAC-8021' },
      { tag: '{{blood_group}}', label: 'Blood Group', sample: 'A+' },
      { tag: '{{phone}}', label: 'Contact Phone', sample: '+880 1800-112233' },
      { tag: '{{email}}', label: 'Campus Email', sample: 'vance@alpha.edu' },
      { tag: '{{teacher_photo}}', label: 'Faculty Photo', sample: '/default-avatar.png' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{card_number}}', label: 'Card Serial', sample: 'TCH-2026-044' },
      { tag: '{{valid_upto}}', label: 'Valid Upto', sample: 'Dec 2028' },
      { tag: '{{barcode}}', label: 'Barcode Code', sample: '*TCH2026044*' },
    ]
  },
  officer_id: {
    key: 'officer_id',
    name: 'Officer & Admin ID Card',
    slug: 'officer-id-card',
    systemTable: 'system_officer_id_templates',
    websiteTable: 'website_officer_id_templates',
    width: 600,
    height: 380,
    dimension_width: 86.00,
    dimension_height: 54.00,
    dimension_unit: 'mm',
    hasBackSide: true,
    mergeTags: [
      { tag: '{{officer_name}}', label: 'Officer Name', sample: 'Sarah Jenkins' },
      { tag: '{{designation}}', label: 'Designation', sample: 'Head Registrar' },
      { tag: '{{department}}', label: 'Department', sample: 'Administration & Admissions' },
      { tag: '{{employee_id}}', label: 'Employee ID', sample: 'ADM-1092' },
      { tag: '{{blood_group}}', label: 'Blood Group', sample: 'B+' },
      { tag: '{{phone}}', label: 'Contact Phone', sample: '+880 1900-445566' },
      { tag: '{{email}}', label: 'Staff Email', sample: 'registrar@alpha.edu' },
      { tag: '{{officer_photo}}', label: 'Officer Photo', sample: '/default-avatar.png' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{card_number}}', label: 'Card Serial', sample: 'OFF-2026-009' },
      { tag: '{{valid_upto}}', label: 'Valid Upto', sample: 'Dec 2028' },
      { tag: '{{barcode}}', label: 'Barcode Code', sample: '*OFF2026009*' },
    ]
  },
  student_tc: {
    key: 'student_tc',
    name: 'Transfer Certificate (TC)',
    slug: 'tc',
    systemTable: 'system_student_tc_templates',
    websiteTable: 'website_student_tc_templates',
    width: 600,
    height: 848,
    dimension_width: 210.00,
    dimension_height: 297.00,
    dimension_unit: 'mm',
    hasBackSide: false,
    mergeTags: [
      { tag: '{{tc_number}}', label: 'TC Number', sample: 'TC-2026-0089' },
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Alexander Sterling' },
      { tag: '{{father_name}}', label: 'Father Name', sample: 'Robert Sterling' },
      { tag: '{{mother_name}}', label: 'Mother Name', sample: 'Elena Sterling' },
      { tag: '{{admission_date}}', label: 'Admission Date', sample: '10 Jan 2022' },
      { tag: '{{leaving_date}}', label: 'Leaving Date', sample: '18 Oct 2026' },
      { tag: '{{last_class_passed}}', label: 'Class Passed', sample: 'Class 9 (Grade A)' },
      { tag: '{{promoted_class}}', label: 'Promoted To', sample: 'Class 10' },
      { tag: '{{reason_for_leaving}}', label: 'Reason', sample: 'Parental relocation to capital' },
      { tag: '{{destination_school}}', label: 'Destination School', sample: 'Metropolitan High' },
      { tag: '{{dues_status}}', label: 'Dues Status', sample: 'Cleared' },
      { tag: '{{conduct}}', label: 'Conduct', sample: 'Exemplary' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{issue_date}}', label: 'Date of Issue', sample: '18 Oct 2026' },
    ]
  },
  student_testimonial: {
    key: 'student_testimonial',
    name: 'Student Testimonial',
    slug: 'testimonial',
    systemTable: 'system_student_testimonial_templates',
    websiteTable: 'website_student_testimonial_templates',
    width: 600,
    height: 848,
    dimension_width: 210.00,
    dimension_height: 297.00,
    dimension_unit: 'mm',
    hasBackSide: false,
    mergeTags: [
      { tag: '{{testimonial_no}}', label: 'Testimonial No', sample: 'TM-2026-1044' },
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Eleanor Bennett' },
      { tag: '{{father_name}}', label: 'Father Name', sample: 'Thomas Bennett' },
      { tag: '{{mother_name}}', label: 'Mother Name', sample: 'Grace Bennett' },
      { tag: '{{roll_no}}', label: 'Board Roll', sample: '884192' },
      { tag: '{{registration_no}}', label: 'Reg No', sample: '1820491024' },
      { tag: '{{examination_name}}', label: 'Examination', sample: 'Higher Secondary Certificate' },
      { tag: '{{session_name}}', label: 'Academic Session', sample: '2024-2025' },
      { tag: '{{passing_year}}', label: 'Passing Year', sample: '2026' },
      { tag: '{{gpa}}', label: 'GPA Score', sample: '5.00 (Golden)' },
      { tag: '{{conduct}}', label: 'Conduct', sample: 'Exemplary & Courteous' },
      { tag: '{{academic_character}}', label: 'Character', sample: 'Outstanding' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{issue_date}}', label: 'Date of Issue', sample: '18 Oct 2026' },
    ]
  },
  student_certificate: {
    key: 'student_certificate',
    name: 'Certificate of Excellence',
    slug: 'certificate',
    systemTable: 'system_student_certificate_templates',
    websiteTable: 'website_student_certificate_templates',
    width: 848,
    height: 600,
    dimension_width: 297.00,
    dimension_height: 210.00,
    dimension_unit: 'mm',
    hasBackSide: false,
    mergeTags: [
      { tag: '{{certificate_no}}', label: 'Certificate No', sample: 'CERT-2026-9932' },
      { tag: '{{recipient_name}}', label: 'Recipient Name', sample: 'Julian Drake' },
      { tag: '{{award_title}}', label: 'Award Title', sample: 'Valedictorian Honors' },
      { tag: '{{achievement_description}}', label: 'Description', sample: 'For outstanding distinction in academic sciences and campus leadership.' },
      { tag: '{{event_date}}', label: 'Ceremony Date', sample: '15 Oct 2026' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{issue_date}}', label: 'Issue Date', sample: '18 Oct 2026' },
    ]
  },
  payment_receipt: {
    key: 'payment_receipt',
    name: 'Payment Receipt',
    slug: 'payment-receipt',
    systemTable: 'system_payment_receipt_templates',
    websiteTable: 'website_payment_receipt_templates',
    width: 600,
    height: 848,
    dimension_width: 210.00,
    dimension_height: 297.00,
    dimension_unit: 'mm',
    hasBackSide: false,
    mergeTags: [
      { tag: '{{receipt_no}}', label: 'Receipt No', sample: 'REC-90218' },
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Marcus Stone' },
      { tag: '{{class_name}}', label: 'Class', sample: 'Grade 10' },
      { tag: '{{roll_no}}', label: 'Roll No', sample: '44' },
      { tag: '{{payment_date}}', label: 'Payment Date', sample: '18 Oct 2026' },
      { tag: '{{amount_paid}}', label: 'Amount Paid', sample: '$450.00' },
      { tag: '{{payment_method}}', label: 'Method', sample: 'Online Card / Stripe' },
      { tag: '{{transaction_id}}', label: 'Txn Ref', sample: 'TXN-9021-9988' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
    ]
  },
  poster: {
    key: 'poster',
    name: 'Campus Event Poster',
    slug: 'poster',
    systemTable: 'system_poster_templates',
    websiteTable: 'website_poster_templates',
    width: 600,
    height: 848,
    dimension_width: 210.00,
    dimension_height: 297.00,
    dimension_unit: 'mm',
    hasBackSide: false,
    mergeTags: [
      { tag: '{{event_title}}', label: 'Event Title', sample: 'Annual Tech & Science Expo 2026' },
      { tag: '{{event_date}}', label: 'Date', sample: 'Nov 12-14, 2026' },
      { tag: '{{event_time}}', label: 'Time', sample: '09:00 AM - 05:00 PM' },
      { tag: '{{event_venue}}', label: 'Venue', sample: 'Auditorium Main Hall' },
      { tag: '{{organizer}}', label: 'Organizer', sample: 'Department of Computer Science' },
      { tag: '{{contact_info}}', label: 'Contact Phone', sample: '+880 1800-998877' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
    ]
  },
  admit_card: {
    key: 'admit_card',
    name: 'Admit Card / Hall Ticket',
    slug: 'admit-card',
    systemTable: 'system_admit_card_templates',
    websiteTable: 'website_admit_card_templates',
    width: 600,
    height: 848,
    dimension_width: 210.00,
    dimension_height: 297.00,
    dimension_unit: 'mm',
    hasBackSide: false,
    mergeTags: [
      { tag: '{{applicant_name}}', label: 'Applicant Name', sample: 'Tanvir Hossain' },
      { tag: '{{application_no}}', label: 'Application Number', sample: 'APP-2026-9081' },
      { tag: '{{exam_roll}}', label: 'Exam Roll Number', sample: 'EXAM-10492' },
      { tag: '{{roll_no}}', label: 'Roll Number (Alt)', sample: 'EXAM-10492' },
      { tag: '{{father_name}}', label: 'Father Name', sample: 'Muhammad Ali Hossain' },
      { tag: '{{mother_name}}', label: 'Mother Name', sample: 'Fatema Begum' },
      { tag: '{{date_of_birth}}', label: 'Date of Birth', sample: '15 Aug 2008' },
      { tag: '{{gender}}', label: 'Gender', sample: 'Male' },
      { tag: '{{phone}}', label: 'Phone Number', sample: '+880 1700-112233' },
      { tag: '{{email}}', label: 'Email Address', sample: 'applicant@example.com' },
      { tag: '{{class_name}}', label: 'Class / Program', sample: 'Class 11 (Science)' },
      { tag: '{{session_name}}', label: 'Academic Session', sample: '2026-2027' },
      { tag: '{{circular_title}}', label: 'Circular Title', sample: 'Higher Secondary Admission 2026' },
      { tag: '{{exam_date}}', label: 'Exam Date', sample: 'Saturday, 15 Nov 2026' },
      { tag: '{{exam_time}}', label: 'Exam Time', sample: '10:00 AM - 12:00 PM' },
      { tag: '{{exam_venue}}', label: 'Exam Venue / Hall', sample: 'Main Academic Building, Room 402' },
      { tag: '{{exam_instructions}}', label: 'Exam Instructions', sample: '1. Arrive 30 minutes early.\n2. Bring printed admit card.\n3. Electronic devices prohibited.' },
      { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
      { tag: '{{candidate_photo}}', label: 'Candidate Photo URL', sample: '/default-avatar.png' },
      { tag: '{{candidate_signature}}', label: 'Candidate Signature URL', sample: '' },
      { tag: '{{qr_code}}', label: 'QR / Barcode Serial', sample: 'APP-2026-9081' },
    ]
  }
};

// Generates starter Fabric JSON for any task
export function generateStarterFabricJSON(taskKey) {
  const config = TASK_CONFIGS[taskKey] || TASK_CONFIGS.student_id;
  const isLandscape = (config.dimension_width || config.width) >= (config.dimension_height || config.height);
  const w = config.width;
  const h = config.height;

  if (taskKey === 'student_id') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        // Top header band
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: w,
          height: 70,
          fill: '#1e3a8a',
          selectable: true,
          name: 'Header Banner'
        },
        // Institute Name
        {
          type: 'i-text',
          left: 20,
          top: 15,
          text: 'ALPHA INTERNATIONAL ACADEMY',
          fontSize: 16,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#ffffff',
          name: 'Institute Title'
        },
        {
          type: 'i-text',
          left: 20,
          top: 38,
          text: 'STUDENT IDENTITY CARD',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#93c5fd',
          name: 'Card Subtitle'
        },
        // Photo Placeholder Frame
        {
          type: 'rect',
          left: 30,
          top: 95,
          width: 120,
          height: 145,
          fill: '#f1f5f9',
          stroke: '#cbd5e1',
          strokeWidth: 2,
          rx: 6,
          ry: 6,
          name: 'Photo Frame'
        },
        {
          type: 'i-text',
          left: 55,
          top: 155,
          text: 'PHOTO',
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#94a3b8',
          name: 'Photo Label'
        },
        // Student Name
        {
          type: 'i-text',
          left: 175,
          top: 95,
          text: '{{student_name}}',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Student Name'
        },
        // Details
        {
          type: 'i-text',
          left: 175,
          top: 130,
          text: 'Class: {{class_name}}   |   Section: {{section_name}}',
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#334155',
          name: 'Class Details'
        },
        {
          type: 'i-text',
          left: 175,
          top: 155,
          text: 'Roll No: {{roll_no}}   |   Reg No: {{registration_no}}',
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#334155',
          name: 'Roll and Reg'
        },
        {
          type: 'i-text',
          left: 175,
          top: 180,
          text: 'Blood Group: {{blood_group}}',
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#dc2626',
          name: 'Blood Group'
        },
        {
          type: 'i-text',
          left: 175,
          top: 205,
          text: 'Emergency: {{emergency_contact}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#64748b',
          name: 'Emergency'
        },
        // Bottom Footer Band
        {
          type: 'rect',
          left: 0,
          top: h - 50,
          width: w,
          height: 50,
          fill: '#0f172a',
          selectable: true,
          name: 'Footer Banner'
        },
        {
          type: 'i-text',
          left: 20,
          top: h - 35,
          text: 'Card: {{card_number}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#94a3b8',
          name: 'Card Number'
        },
        {
          type: 'i-text',
          left: w - 170,
          top: h - 35,
          text: 'Expires: {{expiry_date}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#94a3b8',
          name: 'Expiry Date'
        }
      ]
    };
  }

  if (taskKey === 'teacher_id') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: w,
          height: 65,
          fill: '#0f172a',
          selectable: true,
          name: 'Header Navy'
        },
        {
          type: 'i-text',
          left: 24,
          top: 16,
          text: 'ALPHA INSTITUTE OF TECHNOLOGY',
          fontSize: 15,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#f8fafc',
          name: 'Institute Header'
        },
        {
          type: 'i-text',
          left: 24,
          top: 38,
          text: 'FACULTY & RESEARCH IDENTITY PASS',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#38bdf8',
          name: 'Badge Type'
        },
        // Photo Box
        {
          type: 'rect',
          left: 30,
          top: 90,
          width: 120,
          height: 145,
          fill: '#f8fafc',
          stroke: '#94a3b8',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          name: 'Faculty Photo'
        },
        {
          type: 'i-text',
          left: 55,
          top: 150,
          text: 'FACULTY',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#94a3b8',
          name: 'Faculty Tag'
        },
        // Name & Designation
        {
          type: 'i-text',
          left: 175,
          top: 90,
          text: '{{teacher_name}}',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Faculty Name'
        },
        {
          type: 'i-text',
          left: 175,
          top: 120,
          text: '{{designation}}',
          fontSize: 14,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#2563eb',
          name: 'Designation'
        },
        {
          type: 'i-text',
          left: 175,
          top: 150,
          text: 'Dept: {{department}}',
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#334155',
          name: 'Department'
        },
        {
          type: 'i-text',
          left: 175,
          top: 175,
          text: 'Faculty ID: {{teacher_id}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Faculty ID'
        },
        {
          type: 'i-text',
          left: 175,
          top: 200,
          text: 'Email: {{email}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#64748b',
          name: 'Email'
        },
        // Footer
        {
          type: 'rect',
          left: 0,
          top: h - 45,
          width: w,
          height: 45,
          fill: '#f1f5f9',
          stroke: '#e2e8f0',
          strokeWidth: 1,
          selectable: true,
          name: 'Footer Band'
        },
        {
          type: 'i-text',
          left: 20,
          top: h - 30,
          text: 'Serial: {{card_number}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Serial'
        },
        {
          type: 'i-text',
          left: w - 160,
          top: h - 30,
          text: 'Valid: {{valid_upto}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Validity'
        }
      ]
    };
  }

  if (taskKey === 'officer_id') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: w,
          height: 65,
          fill: '#090d16',
          selectable: true,
          name: 'Header Dark'
        },
        {
          type: 'i-text',
          left: 24,
          top: 16,
          text: 'ALPHA CAMPUS ADMINISTRATION',
          fontSize: 15,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#f8fafc',
          name: 'Institute Header'
        },
        {
          type: 'i-text',
          left: 24,
          top: 38,
          text: 'OFFICIAL ADMINISTRATIVE STAFF CREDENTIAL',
          fontSize: 9,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#f59e0b',
          name: 'Badge Type'
        },
        // Photo Box
        {
          type: 'rect',
          left: 30,
          top: 90,
          width: 120,
          height: 145,
          fill: '#f8fafc',
          stroke: '#d97706',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          name: 'Officer Photo'
        },
        {
          type: 'i-text',
          left: 55,
          top: 150,
          text: 'OFFICER',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#b45309',
          name: 'Officer Tag'
        },
        // Details
        {
          type: 'i-text',
          left: 175,
          top: 90,
          text: '{{officer_name}}',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Officer Name'
        },
        {
          type: 'i-text',
          left: 175,
          top: 120,
          text: '{{designation}}',
          fontSize: 14,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#d97706',
          name: 'Designation'
        },
        {
          type: 'i-text',
          left: 175,
          top: 150,
          text: 'Dept: {{department}}',
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#334155',
          name: 'Department'
        },
        {
          type: 'i-text',
          left: 175,
          top: 175,
          text: 'Staff ID: {{employee_id}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Staff ID'
        },
        {
          type: 'i-text',
          left: 175,
          top: 200,
          text: 'Email: {{email}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#64748b',
          name: 'Email'
        },
        // Footer
        {
          type: 'rect',
          left: 0,
          top: h - 45,
          width: w,
          height: 45,
          fill: '#090d16',
          selectable: true,
          name: 'Footer Band'
        },
        {
          type: 'i-text',
          left: 20,
          top: h - 30,
          text: 'Pass: {{card_number}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#cbd5e1',
          name: 'Card Number'
        },
        {
          type: 'i-text',
          left: w - 160,
          top: h - 30,
          text: 'Valid: {{valid_upto}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#cbd5e1',
          name: 'Validity'
        }
      ]
    };
  }

  // A4 Document Templates (TC, Testimonial, Certificate)
  if (taskKey === 'student_tc') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        // Outer decorative border
        {
          type: 'rect',
          left: 20,
          top: 20,
          width: w - 40,
          height: h - 40,
          fill: 'transparent',
          stroke: '#1e3a8a',
          strokeWidth: 3,
          name: 'Outer Border'
        },
        {
          type: 'rect',
          left: 26,
          top: 26,
          width: w - 52,
          height: h - 52,
          fill: 'transparent',
          stroke: '#93c5fd',
          strokeWidth: 1,
          name: 'Inner Border'
        },
        {
          type: 'i-text',
          left: w / 2 - 170,
          top: 50,
          text: 'ALPHA INTERNATIONAL ACADEMY',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#1e3a8a',
          name: 'Institute Title'
        },
        {
          type: 'i-text',
          left: w / 2 - 130,
          top: 80,
          text: 'CAMPUS TRANSFER CERTIFICATE',
          fontSize: 14,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#b45309',
          name: 'Doc Subtitle'
        },
        {
          type: 'i-text',
          left: 45,
          top: 130,
          text: 'TC Serial No: {{tc_number}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'TC No'
        },
        {
          type: 'i-text',
          left: w - 210,
          top: 130,
          text: 'Issue Date: {{issue_date}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#475569',
          name: 'Issue Date'
        },
        // Body Paragraph
        {
          type: 'i-text',
          left: 45,
          top: 180,
          text: 'This is to officially certify that {{student_name}}, son/daughter of {{father_name}} and {{mother_name}}, was a bona fide student of this academy admitted on {{admission_date}}.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          width: w - 90,
          name: 'Body Paragraph 1'
        },
        {
          type: 'i-text',
          left: 45,
          top: 250,
          text: 'He/She successfully cleared {{last_class_passed}} and has been promoted to {{promoted_class}}. All institutional dues have been certified as: {{dues_status}}.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          width: w - 90,
          name: 'Body Paragraph 2'
        },
        {
          type: 'i-text',
          left: 45,
          top: 320,
          text: 'Reason for Transfer: {{reason_for_leaving}}.\nDestination Institution: {{destination_school}}.\nGeneral Conduct & Demeanor: {{conduct}}.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          name: 'Body Paragraph 3'
        },
        // Signatures
        {
          type: 'line',
          left: 45,
          top: h - 110,
          width: 140,
          stroke: '#94a3b8',
          strokeWidth: 1,
          name: 'Sig Line 1'
        },
        {
          type: 'i-text',
          left: 45,
          top: h - 95,
          text: 'Prepared By (Registrar)',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#64748b',
          name: 'Sig Label 1'
        },
        {
          type: 'line',
          left: w - 195,
          top: h - 110,
          width: 140,
          stroke: '#94a3b8',
          strokeWidth: 1,
          name: 'Sig Line 2'
        },
        {
          type: 'i-text',
          left: w - 195,
          top: h - 95,
          text: 'Principal / Head of School',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#64748b',
          name: 'Sig Label 2'
        }
      ]
    };
  }

  if (taskKey === 'student_testimonial') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 20,
          top: 20,
          width: w - 40,
          height: h - 40,
          fill: 'transparent',
          stroke: '#0f172a',
          strokeWidth: 3,
          name: 'Outer Frame'
        },
        {
          type: 'i-text',
          left: w / 2 - 160,
          top: 60,
          text: 'ALPHA INTERNATIONAL ACADEMY',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Institute Header'
        },
        {
          type: 'i-text',
          left: w / 2 - 100,
          top: 95,
          text: 'ACADEMIC TESTIMONIAL',
          fontSize: 15,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#2563eb',
          name: 'Doc Subtitle'
        },
        {
          type: 'i-text',
          left: 50,
          top: 150,
          text: 'Ref No: {{testimonial_no}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Ref No'
        },
        {
          type: 'i-text',
          left: w - 210,
          top: 150,
          text: 'Date: {{issue_date}}',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#475569',
          name: 'Date'
        },
        {
          type: 'i-text',
          left: 50,
          top: 210,
          text: 'It provides great satisfaction to certify that {{student_name}}, son/daughter of {{father_name}} and {{mother_name}}, bearing Roll No: {{roll_no}} and Registration No: {{registration_no}}, was a regular and meritorious student of this institution.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          name: 'Para 1'
        },
        {
          type: 'i-text',
          left: 50,
          top: 290,
          text: 'He/She successfully passed the {{examination_name}} in the academic year {{passing_year}} (Session {{session_name}}) securing a Cumulative GPA of {{gpa}}.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          name: 'Para 2'
        },
        {
          type: 'i-text',
          left: 50,
          top: 360,
          text: 'To the best of our knowledge and records, his/her moral character has been {{academic_character}} and conduct has been {{conduct}}. He/She took active part in co-curricular activities and exhibited commendable leadership.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          name: 'Para 3'
        },
        {
          type: 'i-text',
          left: 50,
          top: 440,
          text: 'We wholeheartedly wish him/her every triumph and fulfillment in all prospective academic and professional undertakings.',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#1e293b',
          name: 'Para 4'
        },
        // Signatures
        {
          type: 'line',
          left: w - 220,
          top: h - 110,
          width: 170,
          stroke: '#94a3b8',
          strokeWidth: 1,
          name: 'Sig Line'
        },
        {
          type: 'i-text',
          left: w - 220,
          top: h - 95,
          text: 'Head of Institution / Principal',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#64748b',
          name: 'Sig Label'
        }
      ]
    };
  }

  if (taskKey === 'student_certificate') {
    return {
      version: '5.3.0',
      background: '#fffdf5',
      objects: [
        // Ornate outer frame
        {
          type: 'rect',
          left: 25,
          top: 25,
          width: w - 50,
          height: h - 50,
          fill: 'transparent',
          stroke: '#b45309',
          strokeWidth: 4,
          name: 'Gold Outer Border'
        },
        {
          type: 'rect',
          left: 33,
          top: 33,
          width: w - 66,
          height: h - 66,
          fill: 'transparent',
          stroke: '#f59e0b',
          strokeWidth: 1,
          name: 'Gold Inner Border'
        },
        {
          type: 'i-text',
          left: w / 2 - 180,
          top: 60,
          text: 'ALPHA INTERNATIONAL ACADEMY',
          fontSize: 22,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#78350f',
          name: 'Institute Header'
        },
        {
          type: 'i-text',
          left: w / 2 - 160,
          top: 110,
          text: 'CERTIFICATE OF EXCELLENCE',
          fontSize: 24,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#b45309',
          name: 'Certificate Title'
        },
        {
          type: 'i-text',
          left: w / 2 - 85,
          top: 170,
          text: 'PROUDLY PRESENTED TO',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#92400e',
          name: 'Presented To'
        },
        {
          type: 'i-text',
          left: w / 2 - 140,
          top: 205,
          text: '{{recipient_name}}',
          fontSize: 32,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Recipient Name'
        },
        {
          type: 'i-text',
          left: w / 2 - 120,
          top: 265,
          text: 'IN RECOGNITION OF OUTSTANDING DISTINCTION IN',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#78350f',
          name: 'In Recognition'
        },
        {
          type: 'i-text',
          left: w / 2 - 100,
          top: 295,
          text: '{{award_title}}',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#1e3a8a',
          name: 'Award Title'
        },
        {
          type: 'i-text',
          left: 80,
          top: 350,
          text: '{{achievement_description}}',
          fontSize: 13,
          fontFamily: 'Inter',
          fill: '#334155',
          textAlign: 'center',
          name: 'Achievement Desc'
        },
        // Signatures & Serial
        {
          type: 'i-text',
          left: 80,
          top: h - 85,
          text: 'Serial: {{certificate_no}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fill: '#64748b',
          name: 'Cert No'
        },
        {
          type: 'line',
          left: w - 240,
          top: h - 90,
          width: 160,
          stroke: '#94a3b8',
          strokeWidth: 1,
          name: 'Sig Line'
        },
        {
          type: 'i-text',
          left: w - 240,
          top: h - 75,
          text: 'Authorized Signature',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#64748b',
          name: 'Sig Label'
        }
      ]
    };
  }

  if (taskKey === 'admit_card' || taskKey === 'admission_admit_card' || taskKey === 'admit-card') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 15,
          top: 15,
          width: w - 30,
          height: h - 30,
          fill: 'transparent',
          stroke: '#1e3a8a',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          name: 'Outer Border'
        },
        {
          type: 'rect',
          left: 17,
          top: 17,
          width: w - 34,
          height: 85,
          fill: '#1e3a8a',
          name: 'Header Banner'
        },
        {
          type: 'i-text',
          left: w / 2,
          top: 30,
          originX: 'center',
          text: '{{institution_name}}',
          fontSize: 20,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#ffffff',
          name: 'Institute Name'
        },
        {
          type: 'i-text',
          left: w / 2,
          top: 56,
          originX: 'center',
          text: 'ADMISSION TEST ADMIT CARD / HALL TICKET',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#93c5fd',
          name: 'Card Subtitle'
        },
        {
          type: 'i-text',
          left: w / 2,
          top: 76,
          originX: 'center',
          text: 'Session: {{session_name}} • Program: {{class_name}}',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#e0e7ff',
          name: 'Session Subtitle'
        },
        {
          type: 'rect',
          left: 35,
          top: 115,
          width: 390,
          height: 48,
          fill: '#f0fdf4',
          stroke: '#86efac',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          name: 'Roll Box'
        },
        {
          type: 'i-text',
          left: 50,
          top: 124,
          text: 'EXAM ROLL NO:',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#15803d',
          name: 'Roll Label'
        },
        {
          type: 'i-text',
          left: 50,
          top: 138,
          text: '{{exam_roll}}',
          fontSize: 18,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#14532d',
          name: 'Roll Value'
        },
        {
          type: 'i-text',
          left: 240,
          top: 124,
          text: 'APPLICATION NO:',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#15803d',
          name: 'App Label'
        },
        {
          type: 'i-text',
          left: 240,
          top: 140,
          text: '{{application_no}}',
          fontSize: 14,
          fontFamily: 'Outfit',
          fontWeight: '600',
          fill: '#14532d',
          name: 'App Value'
        },
        {
          type: 'rect',
          left: 445,
          top: 115,
          width: 120,
          height: 140,
          fill: '#f8fafc',
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
          name: 'Photo Frame'
        },
        {
          type: 'i-text',
          left: 505,
          top: 175,
          originX: 'center',
          text: 'PASSPORT\nPHOTO',
          textAlign: 'center',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#94a3b8',
          name: 'Photo Placeholder'
        },
        {
          type: 'rect',
          left: 35,
          top: 175,
          width: 390,
          height: 24,
          fill: '#f1f5f9',
          stroke: '#e2e8f0',
          strokeWidth: 1,
          name: 'Section Header 1'
        },
        {
          type: 'i-text',
          left: 45,
          top: 181,
          text: 'CANDIDATE PARTICULARS',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#1e3a8a',
          name: 'Particulars Title'
        },
        {
          type: 'i-text',
          left: 45,
          top: 208,
          text: "Candidate's Name:",
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#475569',
          name: 'Lbl Name'
        },
        {
          type: 'i-text',
          left: 170,
          top: 207,
          text: '{{applicant_name}}',
          fontSize: 12,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Val Name'
        },
        {
          type: 'i-text',
          left: 45,
          top: 228,
          text: "Father's Name:",
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Lbl Father'
        },
        {
          type: 'i-text',
          left: 170,
          top: 228,
          text: '{{father_name}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#0f172a',
          name: 'Val Father'
        },
        {
          type: 'i-text',
          left: 45,
          top: 248,
          text: "Mother's Name:",
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Lbl Mother'
        },
        {
          type: 'i-text',
          left: 170,
          top: 248,
          text: '{{mother_name}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#0f172a',
          name: 'Val Mother'
        },
        {
          type: 'i-text',
          left: 45,
          top: 268,
          text: 'Date of Birth / Gender:',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Lbl Dob'
        },
        {
          type: 'i-text',
          left: 170,
          top: 268,
          text: '{{date_of_birth}} ({{gender}})',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#0f172a',
          name: 'Val Dob'
        },
        {
          type: 'i-text',
          left: 45,
          top: 288,
          text: 'Mobile & Email:',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          fill: '#475569',
          name: 'Lbl Contact'
        },
        {
          type: 'i-text',
          left: 170,
          top: 288,
          text: '{{phone}} | {{email}}',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fill: '#334155',
          name: 'Val Contact'
        },
        {
          type: 'rect',
          left: 35,
          top: 320,
          width: 530,
          height: 24,
          fill: '#1e3a8a',
          name: 'Section Header 2'
        },
        {
          type: 'i-text',
          left: 45,
          top: 326,
          text: 'EXAMINATION SCHEDULE & TEST CENTER',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#ffffff',
          name: 'Schedule Title'
        },
        {
          type: 'rect',
          left: 35,
          top: 344,
          width: 530,
          height: 95,
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          name: 'Schedule Box'
        },
        {
          type: 'i-text',
          left: 50,
          top: 355,
          text: 'Examination Date:',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#475569',
          name: 'Lbl Exam Date'
        },
        {
          type: 'i-text',
          left: 180,
          top: 354,
          text: '{{exam_date}}',
          fontSize: 12,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#1e3a8a',
          name: 'Val Exam Date'
        },
        {
          type: 'i-text',
          left: 50,
          top: 377,
          text: 'Exam Timing:',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#475569',
          name: 'Lbl Exam Time'
        },
        {
          type: 'i-text',
          left: 180,
          top: 376,
          text: '{{exam_time}} (Reporting: 30 mins prior)',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#b45309',
          name: 'Val Exam Time'
        },
        {
          type: 'i-text',
          left: 50,
          top: 400,
          text: 'Assigned Venue / Hall:',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#475569',
          name: 'Lbl Exam Venue'
        },
        {
          type: 'i-text',
          left: 180,
          top: 400,
          text: '{{exam_venue}}',
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Val Exam Venue'
        },
        {
          type: 'rect',
          left: 35,
          top: 455,
          width: 530,
          height: 24,
          fill: '#0f172a',
          name: 'Section Header 3'
        },
        {
          type: 'i-text',
          left: 45,
          top: 461,
          text: 'ESSENTIAL RULES & INSTRUCTIONS TO CANDIDATES',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#ffffff',
          name: 'Instructions Title'
        },
        {
          type: 'rect',
          left: 35,
          top: 479,
          width: 530,
          height: 190,
          fill: '#ffffff',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          name: 'Instructions Body Box'
        },
        {
          type: 'i-text',
          left: 48,
          top: 490,
          text: '1. CANDIDATE VERIFICATION: Candidate must present this Admit Card along with valid photo ID at the entrance.\n2. REPORTING TIME: Candidates must report to the examination center at least 30 minutes prior to scheduled start.\n3. PROHIBITED ITEMS: Mobile phones, smart watches, calculators, bags, and electronic equipment are strictly forbidden.\n4. STATIONERY: Bring your own black/blue ballpoint pens. Sharing of stationery inside examination hall is disallowed.\n5. SEAT ALLOCATION: Occupy only the desk matching your Examination Roll Number listed on the room seating chart.\n6. ATTENDANCE: Ensure your signature matches your application signature on both this admit card and exam roster.\n7. DISCIPLINE: Any unfair means or impersonation will result in immediate disqualification and legal proceedings.\n8. RETENTION: Keep this Admit Card safely until the final admission counseling and enrollment process concludes.',
          fontSize: 9.5,
          fontFamily: 'Inter',
          fill: '#334155',
          lineHeight: 1.5,
          name: 'Rules Text'
        },
        {
          type: 'line',
          left: 55,
          top: 755,
          width: 170,
          stroke: '#94a3b8',
          strokeWidth: 1,
          name: 'Candidate Sig Line'
        },
        {
          type: 'i-text',
          left: 65,
          top: 762,
          text: "Candidate's Signature",
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#475569',
          name: 'Candidate Sig Label'
        },
        {
          type: 'line',
          left: 375,
          top: 755,
          width: 170,
          stroke: '#94a3b8',
          strokeWidth: 1,
          name: 'Controller Sig Line'
        },
        {
          type: 'i-text',
          left: 385,
          top: 762,
          text: 'Controller of Examinations',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#1e3a8a',
          name: 'Controller Sig Label'
        },
        {
          type: 'i-text',
          left: w / 2,
          top: 810,
          originX: 'center',
          text: 'Computer Generated Official Document • Verification Code: {{application_no}}',
          fontSize: 8,
          fontFamily: 'Inter',
          fill: '#94a3b8',
          name: 'Footer Verification'
        }
      ]
    };
  }

  // Generic fallback starter
  return {
    version: '5.3.0',
    background: '#ffffff',
    objects: [
      {
        type: 'rect',
        left: 20,
        top: 20,
        width: w - 40,
        height: 60,
        fill: '#0f172a',
        name: 'Header'
      },
      {
        type: 'i-text',
        left: 35,
        top: 35,
        text: config.name.toUpperCase(),
        fontSize: 16,
        fontFamily: 'Outfit',
        fontWeight: 'bold',
        fill: '#ffffff',
        name: 'Doc Title'
      }
    ]
  };
}

// Generates starter Fabric JSON for back side of ID cards
export function generateStarterFabricBackJSON(taskKey) {
  const config = TASK_CONFIGS[taskKey] || TASK_CONFIGS.student_id;
  const w = config.width || 600;
  const h = config.height || 380;

  if (taskKey === 'student_id') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: w,
          height: 38,
          fill: '#0f172a',
          name: 'Back Header Ribbon'
        },
        {
          type: 'i-text',
          left: 20,
          top: 11,
          text: 'STUDENT IDENTITY PASS • TERMS & RULES',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#38bdf8',
          name: 'Rules Title'
        },
        {
          type: 'i-text',
          left: 20,
          top: 52,
          text: '1. This credential is the official institutional property of Alpha International Academy.\n2. Must be visibly displayed at all times when present on campus grounds.\n3. Strictly non-transferable. Misuse or alteration will lead to disciplinary proceedings.\n4. Surrender this card upon graduation, withdrawal, or administrative request.',
          fontSize: 10,
          fontFamily: 'Inter',
          fill: '#334155',
          lineHeight: 1.45,
          name: 'Terms Body'
        },
        {
          type: 'rect',
          left: 20,
          top: 135,
          width: w - 40,
          height: 52,
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          name: 'Lost Notice Box'
        },
        {
          type: 'i-text',
          left: 30,
          top: 145,
          text: 'LOST CARD RETURN NOTICE:\nIf found, please hand over to Student Affairs Office, Admin Building Level 2.\nHotline: +880 1700-000000 • Email: studentaffairs@alpha.edu',
          fontSize: 10,
          fontFamily: 'Inter',
          fill: '#475569',
          name: 'Lost Return Text'
        },
        {
          type: 'line',
          left: w - 210,
          top: 245,
          width: 185,
          stroke: '#0f172a',
          strokeWidth: 1.5,
          name: 'Sig Line'
        },
        {
          type: 'i-text',
          left: w - 195,
          top: 252,
          text: 'Principal / Headmaster Signature',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Principal Sig Label'
        },
        {
          type: 'rect',
          left: 20,
          top: 215,
          width: 180,
          height: 48,
          fill: '#ffffff',
          stroke: '#94a3b8',
          strokeWidth: 1,
          rx: 3,
          ry: 3,
          name: 'Barcode Box'
        },
        {
          type: 'i-text',
          left: 32,
          top: 230,
          text: '{{barcode}}',
          fontSize: 15,
          fontFamily: 'Courier',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Barcode Value'
        }
      ]
    };
  }

  if (taskKey === 'teacher_id') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: w,
          height: 38,
          fill: '#0f172a',
          name: 'Back Header Ribbon'
        },
        {
          type: 'i-text',
          left: 20,
          top: 11,
          text: 'FACULTY IDENTITY CREDENTIAL • CODE OF CONDUCT',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#38bdf8',
          name: 'Faculty Back Title'
        },
        {
          type: 'i-text',
          left: 20,
          top: 52,
          text: '1. Valid for academic access, faculty library privileges, and research laboratory entry.\n2. Card must be surrendered immediately upon cessation of faculty appointment.\n3. In case of loss or damage, notify the Academic Registrar without delay.\n4. Unauthorized reproduction of this credential is strictly prohibited.',
          fontSize: 10,
          fontFamily: 'Inter',
          fill: '#334155',
          lineHeight: 1.45,
          name: 'Faculty Terms Body'
        },
        {
          type: 'rect',
          left: 20,
          top: 135,
          width: w - 40,
          height: 52,
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          name: 'Return Box'
        },
        {
          type: 'i-text',
          left: 30,
          top: 145,
          text: 'INSTITUTIONAL RETURN ADDRESS:\nFaculty Affairs Division, Alpha International Academy, Central Campus.\nFaculty Hotline: +880 1800-112233 • Email: faculty@alpha.edu',
          fontSize: 10,
          fontFamily: 'Inter',
          fill: '#475569',
          name: 'Return Text'
        },
        {
          type: 'line',
          left: w - 210,
          top: 245,
          width: 185,
          stroke: '#0f172a',
          strokeWidth: 1.5,
          name: 'Sig Line'
        },
        {
          type: 'i-text',
          left: w - 195,
          top: 252,
          text: 'Authorized Signatory / Registrar',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Signatory Label'
        },
        {
          type: 'rect',
          left: 20,
          top: 215,
          width: 180,
          height: 48,
          fill: '#ffffff',
          stroke: '#94a3b8',
          strokeWidth: 1,
          rx: 3,
          ry: 3,
          name: 'Barcode Box'
        },
        {
          type: 'i-text',
          left: 32,
          top: 230,
          text: '{{barcode}}',
          fontSize: 15,
          fontFamily: 'Courier',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Barcode Value'
        }
      ]
    };
  }

  if (taskKey === 'officer_id') {
    return {
      version: '5.3.0',
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: w,
          height: 38,
          fill: '#0f172a',
          name: 'Back Header Ribbon'
        },
        {
          type: 'i-text',
          left: 20,
          top: 11,
          text: 'ADMINISTRATIVE ACCESS CREDENTIAL • SECURITY RULES',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#38bdf8',
          name: 'Officer Back Title'
        },
        {
          type: 'i-text',
          left: 20,
          top: 52,
          text: '1. Grants authorized access to administrative facilities, archives, and institutional portals.\n2. Must be presented to security personnel upon entry into restricted campus zones.\n3. Strictly non-transferable. Any unauthorized transfer constitutes a serious violation.\n4. Report compromised or lost passes immediately to Security Command.',
          fontSize: 10,
          fontFamily: 'Inter',
          fill: '#334155',
          lineHeight: 1.45,
          name: 'Officer Terms Body'
        },
        {
          type: 'rect',
          left: 20,
          top: 135,
          width: w - 40,
          height: 52,
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          name: 'Return Box'
        },
        {
          type: 'i-text',
          left: 30,
          top: 145,
          text: 'SECURITY HEADQUARTERS RETURN ADDRESS:\nDirectorate General of Administration, Alpha International Academy.\nSecurity Control Desk: +880 1900-445566 • Email: admin.security@alpha.edu',
          fontSize: 10,
          fontFamily: 'Inter',
          fill: '#475569',
          name: 'Return Text'
        },
        {
          type: 'line',
          left: w - 210,
          top: 245,
          width: 185,
          stroke: '#0f172a',
          strokeWidth: 1.5,
          name: 'Sig Line'
        },
        {
          type: 'i-text',
          left: w - 195,
          top: 252,
          text: 'Director General / Executive Authority',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Director General Sig Label'
        },
        {
          type: 'rect',
          left: 20,
          top: 215,
          width: 180,
          height: 48,
          fill: '#ffffff',
          stroke: '#94a3b8',
          strokeWidth: 1,
          rx: 3,
          ry: 3,
          name: 'Barcode Box'
        },
        {
          type: 'i-text',
          left: 32,
          top: 230,
          text: '{{barcode}}',
          fontSize: 15,
          fontFamily: 'Courier',
          fontWeight: 'bold',
          fill: '#0f172a',
          name: 'Barcode Value'
        }
      ]
    };
  }

  return {
    version: '5.3.0',
    background: '#ffffff',
    objects: []
  };
}

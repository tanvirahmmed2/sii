// Comprehensive merge tags and data fields for Students, Teachers, and Officers
// Covering academic, personal, parental, contact, address, and institutional data points

export const COMPREHENSIVE_STUDENT_TAGS = [
  // Academic & Enrollment
  { tag: '{{student_name}}', label: 'Student Full Name', category: 'academic', sample: 'Tanvir Hossain' },
  { tag: '{{roll_no}}', label: 'Roll Number', category: 'academic', sample: '101' },
  { tag: '{{registration_no}}', label: 'Registration Number', category: 'academic', sample: 'REG-2026-904' },
  { tag: '{{student_unique_id}}', label: 'Student Unique ID', category: 'academic', sample: 'STU-98421' },
  { tag: '{{class_name}}', label: 'Class / Grade', category: 'academic', sample: 'Class 10' },
  { tag: '{{section_name}}', label: 'Section', category: 'academic', sample: 'Science-A' },
  { tag: '{{session_name}}', label: 'Academic Session', category: 'academic', sample: '2026-2027' },
  { tag: '{{department_name}}', label: 'Department / Group', category: 'academic', sample: 'Science' },
  { tag: '{{admission_date}}', label: 'Admission Date', category: 'academic', sample: '12 Jan 2024' },
  { tag: '{{card_number}}', label: 'Card Serial Number', category: 'academic', sample: 'STU-2026-00109' },
  { tag: '{{valid_upto}}', label: 'Valid Upto Date', category: 'academic', sample: '31 Dec 2027' },
  { tag: '{{barcode}}', label: 'Barcode Code', category: 'academic', sample: '*REG2026904*' },
  { tag: '{{qr_code}}', label: 'QR Code Data', category: 'academic', sample: 'https://school.edu/verify/REG-2026-904' },

  // Personal Details
  { tag: '{{gender}}', label: 'Gender', category: 'personal', sample: 'Male' },
  { tag: '{{blood_group}}', label: 'Blood Group', category: 'personal', sample: 'O+' },
  { tag: '{{date_of_birth}}', label: 'Date of Birth', category: 'personal', sample: '14 May 2010' },
  { tag: '{{religion}}', label: 'Religion', category: 'personal', sample: 'Islam' },
  { tag: '{{student_photo}}', label: 'Student Photo (URL / Frame)', category: 'personal', sample: '/default-avatar.png' },

  // Contact Details
  { tag: '{{email}}', label: 'Student Email', category: 'contact', sample: 'student@alpha.edu' },
  { tag: '{{phone}}', label: 'Student Phone / Mobile', category: 'contact', sample: '+880 1700-112233' },
  { tag: '{{emergency_contact}}', label: 'Emergency Contact Hotline', category: 'contact', sample: '+880 1700-000000' },

  // Parents & Guardians
  { tag: '{{father_name}}', label: "Father's Full Name", category: 'guardian', sample: 'Rafiqul Hossain' },
  { tag: '{{father_phone}}', label: "Father's Phone Number", category: 'guardian', sample: '+880 1811-223344' },
  { tag: '{{father_occupation}}', label: "Father's Occupation", category: 'guardian', sample: 'Civil Engineer' },
  { tag: '{{father_nid}}', label: "Father's NID Number", category: 'guardian', sample: '1984261890123' },
  { tag: '{{mother_name}}', label: "Mother's Full Name", category: 'guardian', sample: 'Nasima Begum' },
  { tag: '{{mother_phone}}', label: "Mother's Phone Number", category: 'guardian', sample: '+880 1822-334455' },
  { tag: '{{mother_occupation}}', label: "Mother's Occupation", category: 'guardian', sample: 'Professor' },
  { tag: '{{mother_nid}}', label: "Mother's NID Number", category: 'guardian', sample: '1986261890456' },
  { tag: '{{guardian_name}}', label: 'Primary Guardian Name', category: 'guardian', sample: 'Rafiqul Hossain' },
  { tag: '{{guardian_relation}}', label: 'Guardian Relation', category: 'guardian', sample: 'Father' },
  { tag: '{{guardian_phone}}', label: 'Guardian Phone Number', category: 'guardian', sample: '+880 1811-223344' },
  { tag: '{{guardian_email}}', label: 'Guardian Email', category: 'guardian', sample: 'guardian@gmail.com' },
  { tag: '{{guardian_address}}', label: 'Guardian Residential Address', category: 'guardian', sample: 'House 42, Road 12, Dhanmondi' },

  // Addresses
  { tag: '{{present_address}}', label: 'Present Address', category: 'address', sample: 'House 42, Road 12, Dhanmondi, Dhaka' },
  { tag: '{{permanent_address}}', label: 'Permanent Address', category: 'address', sample: 'Village Northgram, Upazila Sadar, Sylhet' },
  { tag: '{{city}}', label: 'City', category: 'address', sample: 'Dhaka' },
  { tag: '{{district}}', label: 'District', category: 'address', sample: 'Dhaka' },
  { tag: '{{upazila}}', label: 'Upazila / Sub-district', category: 'address', sample: 'Dhanmondi' },
  { tag: '{{postal_code}}', label: 'Postal Code', category: 'address', sample: '1209' },
  { tag: '{{country}}', label: 'Country', category: 'address', sample: 'Bangladesh' },

  // Institutional Info
  { tag: '{{institution_name}}', label: 'Institution / School Name', category: 'institution', sample: 'Alpha International Academy' },
  { tag: '{{institution_logo}}', label: 'Institution Logo', category: 'institution', sample: '/school-logo.png' },
  { tag: '{{institution_address}}', label: 'Campus Address', category: 'institution', sample: 'Plot 18, Block B, Main Campus' },
  { tag: '{{institution_phone}}', label: 'Official Secretariat Phone', category: 'institution', sample: '+880 2 9876543' },
  { tag: '{{institution_email}}', label: 'Official Institution Email', category: 'institution', sample: 'info@alpha.edu' },
  { tag: '{{website_url}}', label: 'Portal Website URL', category: 'institution', sample: 'https://alpha.edu' },
  { tag: '{{signatory_title}}', label: 'Signatory Authority', category: 'institution', sample: 'Principal / Headmaster' },
];

export const COMPREHENSIVE_TEACHER_TAGS = [
  // Academic & Faculty
  { tag: '{{teacher_name}}', label: 'Faculty Full Name', category: 'academic', sample: 'Dr. Michael Vance' },
  { tag: '{{designation}}', label: 'Academic Designation', category: 'academic', sample: 'Senior Lecturer' },
  { tag: '{{department}}', label: 'Department / Faculty', category: 'academic', sample: 'Computer Science & Engineering' },
  { tag: '{{teacher_id}}', label: 'Faculty / Staff ID', category: 'academic', sample: 'FAC-8021' },
  { tag: '{{employee_id}}', label: 'Employee Code', category: 'academic', sample: 'EMP-T-8021' },
  { tag: '{{joining_date}}', label: 'Joining / Appointment Date', category: 'academic', sample: '15 Aug 2021' },
  { tag: '{{card_number}}', label: 'Card Serial Number', category: 'academic', sample: 'TCH-2026-044' },
  { tag: '{{valid_upto}}', label: 'Valid Upto Date', category: 'academic', sample: '31 Dec 2028' },
  { tag: '{{barcode}}', label: 'Barcode Code', category: 'academic', sample: '*TCH2026044*' },
  { tag: '{{qr_code}}', label: 'QR Code Data', category: 'academic', sample: 'https://alpha.edu/verify/FAC-8021' },

  // Personal Details
  { tag: '{{gender}}', label: 'Gender', category: 'personal', sample: 'Male' },
  { tag: '{{blood_group}}', label: 'Blood Group', category: 'personal', sample: 'A+' },
  { tag: '{{date_of_birth}}', label: 'Date of Birth', category: 'personal', sample: '22 Mar 1988' },
  { tag: '{{religion}}', label: 'Religion', category: 'personal', sample: 'Christianity' },
  { tag: '{{teacher_photo}}', label: 'Faculty Photo (URL / Frame)', category: 'personal', sample: '/default-avatar.png' },

  // Contact Info
  { tag: '{{email}}', label: 'Official Faculty Email', category: 'contact', sample: 'vance@alpha.edu' },
  { tag: '{{phone}}', label: 'Contact Phone Number', category: 'contact', sample: '+880 1800-112233' },
  { tag: '{{emergency_contact}}', label: 'Emergency Contact Number', category: 'contact', sample: '+880 1800-998877' },

  // Addresses
  { tag: '{{address}}', label: 'Present / Residential Address', category: 'address', sample: 'Faculty Quarters, Building 3, Campus' },
  { tag: '{{permanent_address}}', label: 'Permanent Address', category: 'address', sample: '44 Hillside Road, Chittagong' },

  // Institutional Info
  { tag: '{{institution_name}}', label: 'Institution Name', category: 'institution', sample: 'Alpha International Academy' },
  { tag: '{{institution_logo}}', label: 'Institution Logo', category: 'institution', sample: '/school-logo.png' },
  { tag: '{{institution_address}}', label: 'Campus Address', category: 'institution', sample: 'Plot 18, Block B, Main Campus' },
  { tag: '{{institution_phone}}', label: 'Secretariat Phone', category: 'institution', sample: '+880 2 9876543' },
  { tag: '{{institution_email}}', label: 'Official Institution Email', category: 'institution', sample: 'hr@alpha.edu' },
  { tag: '{{website_url}}', label: 'Institution Website URL', category: 'institution', sample: 'https://alpha.edu' },
  { tag: '{{signatory_title}}', label: 'Signatory Authority', category: 'institution', sample: 'Dean / Registrar' },
];

export const COMPREHENSIVE_OFFICER_TAGS = [
  // Employment & Security
  { tag: '{{officer_name}}', label: 'Officer Full Name', category: 'academic', sample: 'Sarah Jenkins' },
  { tag: '{{designation}}', label: 'Official Designation', category: 'academic', sample: 'Head Registrar' },
  { tag: '{{department}}', label: 'Administration / Department', category: 'academic', sample: 'Administration & Admissions' },
  { tag: '{{employee_id}}', label: 'Staff / Officer ID', category: 'academic', sample: 'ADM-1092' },
  { tag: '{{officer_id}}', label: 'Officer Code', category: 'academic', sample: 'OFF-1092' },
  { tag: '{{nid_number}}', label: 'National ID / NID Number', category: 'academic', sample: '1991261890987' },
  { tag: '{{joining_date}}', label: 'Appointment / Joining Date', category: 'academic', sample: '01 Feb 2020' },
  { tag: '{{card_number}}', label: 'Security Card Serial', category: 'academic', sample: 'OFF-2026-009' },
  { tag: '{{valid_upto}}', label: 'Valid Upto Date', category: 'academic', sample: '31 Dec 2028' },
  { tag: '{{barcode}}', label: 'Barcode Code', category: 'academic', sample: '*OFF2026009*' },
  { tag: '{{qr_code}}', label: 'Security Verification QR', category: 'academic', sample: 'https://alpha.edu/verify/ADM-1092' },

  // Personal Details
  { tag: '{{gender}}', label: 'Gender', category: 'personal', sample: 'Female' },
  { tag: '{{blood_group}}', label: 'Blood Group', category: 'personal', sample: 'B+' },
  { tag: '{{date_of_birth}}', label: 'Date of Birth', category: 'personal', sample: '18 Jul 1991' },
  { tag: '{{religion}}', label: 'Religion', category: 'personal', sample: 'Islam' },
  { tag: '{{officer_photo}}', label: 'Officer Photo (URL / Frame)', category: 'personal', sample: '/default-avatar.png' },
  { tag: '{{bio}}', label: 'Officer Bio / Summary', category: 'personal', sample: 'Senior Administration Specialist' },

  // Contact Info
  { tag: '{{email}}', label: 'Official Staff Email', category: 'contact', sample: 'registrar@alpha.edu' },
  { tag: '{{phone}}', label: 'Staff Contact Phone', category: 'contact', sample: '+880 1900-445566' },
  { tag: '{{emergency_contact}}', label: 'Emergency Administration Desk', category: 'contact', sample: '+880 1900-000000' },

  // Addresses
  { tag: '{{address}}', label: 'Residential Address', category: 'address', sample: 'Sector 7, Uttara, Dhaka' },
  { tag: '{{permanent_address}}', label: 'Permanent Address', category: 'address', sample: 'Main Road, Bogura Sadar' },

  // Institutional Info
  { tag: '{{institution_name}}', label: 'Institution Name', category: 'institution', sample: 'Alpha International Academy' },
  { tag: '{{institution_logo}}', label: 'Institution Logo', category: 'institution', sample: '/school-logo.png' },
  { tag: '{{institution_address}}', label: 'Headquarters Address', category: 'institution', sample: 'Plot 18, Block B, Main Campus' },
  { tag: '{{institution_phone}}', label: 'Security & Admin Phone', category: 'institution', sample: '+880 2 9876543' },
  { tag: '{{institution_email}}', label: 'Executive Email', category: 'institution', sample: 'admin@alpha.edu' },
  { tag: '{{website_url}}', label: 'Portal URL', category: 'institution', sample: 'https://alpha.edu' },
  { tag: '{{signatory_title}}', label: 'Signatory Authority', category: 'institution', sample: 'Executive Director / Registrar' },
];

export const COMPREHENSIVE_TC_TAGS = [
  // TC Specific
  { tag: '{{tc_number}}', label: 'TC Serial Number', category: 'certificate', sample: 'TC-2026-0089' },
  { tag: '{{issue_date}}', label: 'Date of Issue', category: 'certificate', sample: '18 Oct 2026' },
  { tag: '{{leaving_date}}', label: 'Leaving Date', category: 'certificate', sample: '18 Oct 2026' },
  { tag: '{{last_class_passed}}', label: 'Last Class Passed', category: 'certificate', sample: 'Class 9 (GPA 5.00)' },
  { tag: '{{promoted_class}}', label: 'Promoted To Class', category: 'certificate', sample: 'Class 10' },
  { tag: '{{reason_for_leaving}}', label: 'Reason for Leaving', category: 'certificate', sample: 'Parents Relocation' },
  { tag: '{{destination_school}}', label: 'Destination School', category: 'certificate', sample: 'Metropolitan High' },
  { tag: '{{dues_status}}', label: 'Tuition Dues Status', category: 'certificate', sample: 'All Dues Cleared' },
  { tag: '{{conduct}}', label: 'General Conduct', category: 'certificate', sample: 'Exemplary' },

  // Inherited Full Student Profile Fields
  ...COMPREHENSIVE_STUDENT_TAGS,
];

export const COMPREHENSIVE_TESTIMONIAL_TAGS = [
  // Testimonial Specific
  { tag: '{{testimonial_no}}', label: 'Testimonial Number', category: 'certificate', sample: 'TM-2026-1044' },
  { tag: '{{issue_date}}', label: 'Date of Issue', category: 'certificate', sample: '18 Oct 2026' },
  { tag: '{{examination_name}}', label: 'Examination Name', category: 'certificate', sample: 'Secondary School Certificate (SSC)' },
  { tag: '{{passing_year}}', label: 'Passing Year', category: 'certificate', sample: '2026' },
  { tag: '{{gpa}}', label: 'GPA Score Obtained', category: 'certificate', sample: '5.00' },
  { tag: '{{academic_character}}', label: 'Moral Character', category: 'certificate', sample: 'Excellent' },
  { tag: '{{conduct}}', label: 'Conduct & Behavior', category: 'certificate', sample: 'Satisfactory' },

  // Inherited Full Student Profile Fields
  ...COMPREHENSIVE_STUDENT_TAGS,
];

export const DATA_CATEGORIES = [
  { id: 'all', label: 'All Fields' },
  { id: 'certificate', label: 'Certificate Data' },
  { id: 'academic', label: 'Academic & ID' },
  { id: 'personal', label: 'Personal' },
  { id: 'guardian', label: 'Parents & Guardians' },
  { id: 'contact', label: 'Contact' },
  { id: 'address', label: 'Address' },
  { id: 'institution', label: 'Institution' },
];


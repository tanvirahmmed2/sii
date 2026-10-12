// Default Production-Ready Document & Visual Templates
// Preloaded across 7 core institutional document types

export const DEFAULT_TEMPLATES = [
  // 1. Student ID Card (CR80 Portrait - 54mm x 86mm)
  {
    name: 'Classic Academic Blue Student ID',
    slug: 'classic-academic-blue-student-id',
    category: 'student_id_card',
    description: 'Clean academic student identity card with school crest, photo, barcode, and signature box.',
    dimension_width: 54,
    dimension_height: 86,
    dimension_unit: 'mm',
    orientation: 'portrait',
    available_merge_tags: [
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Alex Morgan' },
      { tag: '{{registration_no}}', label: 'Registration No', sample: 'REG-2026-081' },
      { tag: '{{roll_no}}', label: 'Roll No', sample: '12' },
      { tag: '{{class_name}}', label: 'Class', sample: 'Grade 10' },
      { tag: '{{section_name}}', label: 'Section', sample: 'Section A' },
      { tag: '{{blood_group}}', label: 'Blood Group', sample: 'O+' },
      { tag: '{{student_photo}}', label: 'Photo URL', sample: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300' },
      { tag: '{{school_name}}', label: 'School Name', sample: 'Sky International Academy' },
      { tag: '{{school_logo}}', label: 'School Logo', sample: 'https://api.iconify.design/lucide:graduation-cap.svg' },
      { tag: '{{valid_upto}}', label: 'Valid Upto', sample: 'Dec 2027' },
      { tag: '{{emergency_contact}}', label: 'Emergency Phone', sample: '+1 (555) 019-2834' },
    ],
    html_content: `<div class="id-card-wrapper student-id-card">
  <div class="card-header">
    <div class="header-logo-container">
      <img src="{{school_logo}}" alt="Logo" class="header-logo" />
    </div>
    <div class="header-titles">
      <h3 class="school-name">{{school_name}}</h3>
      <span class="card-badge">STUDENT IDENTITY CARD</span>
    </div>
  </div>

  <div class="photo-wrapper">
    <img src="{{student_photo}}" alt="{{student_name}}" class="student-avatar" />
  </div>

  <div class="student-meta">
    <h4 class="student-name">{{student_name}}</h4>
    <p class="student-class">{{class_name}} • {{section_name}}</p>
  </div>

  <div class="details-grid">
    <div class="detail-row"><span class="lbl">ID / Reg No:</span><span class="val font-mono">{{registration_no}}</span></div>
    <div class="detail-row"><span class="lbl">Roll No:</span><span class="val font-mono">{{roll_no}}</span></div>
    <div class="detail-row"><span class="lbl">Blood Group:</span><span class="val text-danger font-bold">{{blood_group}}</span></div>
    <div class="detail-row"><span class="lbl">Emergency:</span><span class="val">{{emergency_contact}}</span></div>
  </div>

  <div class="card-footer">
    <div class="validity">VALID: <strong>{{valid_upto}}</strong></div>
    <div class="signature-box">
      <div class="sig-line"></div>
      <span class="sig-label">Principal Signature</span>
    </div>
  </div>
</div>`,
    css_content: `.id-card-wrapper {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e293b;
  position: relative;
}
.card-header {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  padding: 10px 12px 8px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}
.header-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  background: white;
  border-radius: 6px;
  padding: 2px;
}
.school-name {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  line-height: 1.2;
}
.card-badge {
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #bfdbfe;
  font-weight: 600;
  display: block;
}
.photo-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  margin-bottom: 6px;
}
.student-avatar {
  width: 68px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #2563eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  background: #f1f5f9;
}
.student-meta {
  text-align: center;
  margin-bottom: 8px;
  padding: 0 8px;
}
.student-name {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.student-class {
  margin: 2px 0 0;
  font-size: 9.5px;
  color: #64748b;
  font-weight: 500;
}
.details-grid {
  padding: 0 14px;
  display: flex;
  flex-direction: column;
  gap: 3.5px;
  flex: 1;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 2px;
}
.detail-row .lbl {
  color: #64748b;
  font-weight: 500;
}
.detail-row .val {
  color: #0f172a;
  font-weight: 600;
}
.card-footer {
  padding: 8px 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.validity {
  font-size: 8px;
  color: #475569;
}
.signature-box {
  text-align: center;
  width: 75px;
}
.sig-line {
  border-bottom: 1px solid #334155;
  height: 12px;
  margin-bottom: 2px;
}
.sig-label {
  font-size: 7px;
  color: #475569;
  font-weight: 600;
  text-transform: uppercase;
}`,
  },

  // 2. Teacher ID Card (CR80 Landscape - 86mm x 54mm)
  {
    name: 'Executive Slate Faculty & Teacher ID',
    slug: 'executive-slate-faculty-teacher-id',
    category: 'teacher_id_card',
    description: 'Sleek landscape faculty identification card for teachers, instructors, and professors.',
    dimension_width: 86,
    dimension_height: 54,
    dimension_unit: 'mm',
    orientation: 'landscape',
    available_merge_tags: [
      { tag: '{{teacher_name}}', label: 'Teacher Name', sample: 'Dr. Marcus Vance' },
      { tag: '{{designation}}', label: 'Designation', sample: 'Senior Lecturer, Physics' },
      { tag: '{{department}}', label: 'Department', sample: 'Department of Science' },
      { tag: '{{employee_id}}', label: 'Employee ID', sample: 'FAC-2026-004' },
      { tag: '{{phone}}', label: 'Phone', sample: '+1 (555) 234-5678' },
      { tag: '{{blood_group}}', label: 'Blood Group', sample: 'A+' },
      { tag: '{{teacher_photo}}', label: 'Photo URL', sample: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' },
      { tag: '{{school_name}}', label: 'Institution Name', sample: 'Sky International Academy' },
      { tag: '{{school_logo}}', label: 'Institution Logo', sample: 'https://api.iconify.design/lucide:shield-check.svg' },
      { tag: '{{signature_url}}', label: 'Signature', sample: '' },
    ],
    html_content: `<div class="id-card-wrapper teacher-id-card">
  <div class="brand-bar">
    <div class="brand-info">
      <img src="{{school_logo}}" alt="Logo" class="school-logo" />
      <div>
        <h3 class="school-title">{{school_name}}</h3>
        <span class="role-badge">OFFICIAL FACULTY PASS</span>
      </div>
    </div>
    <span class="blood-pill">{{blood_group}}</span>
  </div>

  <div class="card-content">
    <div class="photo-col">
      <img src="{{teacher_photo}}" alt="{{teacher_name}}" class="teacher-avatar" />
    </div>
    <div class="info-col">
      <h4 class="teacher-name">{{teacher_name}}</h4>
      <p class="teacher-designation">{{designation}}</p>
      <div class="teacher-grid">
        <div class="item"><span class="k">Dept:</span> <span class="v">{{department}}</span></div>
        <div class="item"><span class="k">Emp ID:</span> <span class="v font-mono">{{employee_id}}</span></div>
        <div class="item"><span class="k">Phone:</span> <span class="v">{{phone}}</span></div>
      </div>
    </div>
  </div>

  <div class="card-bottom">
    <span class="auth-notice">Institutional Property • If found, return to Registrar</span>
    <span class="sign-block">Authorized Signatory</span>
  </div>
</div>`,
    css_content: `.id-card-wrapper {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #0f172a;
  color: #f8fafc;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.brand-bar {
  background: #1e293b;
  padding: 8px 12px;
  border-bottom: 2px solid #38bdf8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.school-logo {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 4px;
  padding: 2px;
}
.school-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #f1f5f9;
}
.role-badge {
  font-size: 7.5px;
  color: #38bdf8;
  font-weight: 600;
  letter-spacing: 0.8px;
}
.blood-pill {
  background: #dc2626;
  color: white;
  font-size: 8px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 9999px;
}
.card-content {
  padding: 8px 12px;
  display: flex;
  gap: 12px;
  flex: 1;
  align-items: center;
}
.photo-col .teacher-avatar {
  width: 60px;
  height: 72px;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid #38bdf8;
}
.info-col {
  flex: 1;
  min-width: 0;
}
.teacher-name {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.teacher-designation {
  margin: 2px 0 6px;
  font-size: 9px;
  color: #94a3b8;
  font-weight: 500;
}
.teacher-grid {
  display: flex;
  flex-direction: column;
  gap: 2.5px;
}
.teacher-grid .item {
  font-size: 8.5px;
}
.teacher-grid .k {
  color: #64748b;
  font-weight: 600;
}
.teacher-grid .v {
  color: #e2e8f0;
  font-weight: 600;
}
.card-bottom {
  padding: 5px 12px;
  background: #090d16;
  border-top: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 7.5px;
  color: #64748b;
}
.sign-block {
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}`,
  },

  // 3. Transfer Certificate (TC) - A4 Portrait (210mm x 297mm)
  {
    name: 'Formal Royal Transfer Certificate (TC)',
    slug: 'formal-royal-transfer-certificate-tc',
    category: 'tc',
    description: 'Government and education board standard Transfer Certificate with ornate border, student record table, and institutional seal.',
    dimension_width: 210,
    dimension_height: 297,
    dimension_unit: 'mm',
    orientation: 'portrait',
    available_merge_tags: [
      { tag: '{{tc_serial}}', label: 'TC Serial No', sample: 'TC-2026-00412' },
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Julianna Hayes' },
      { tag: '{{father_name}}', label: 'Father Name', sample: 'Robert Hayes' },
      { tag: '{{mother_name}}', label: 'Mother Name', sample: 'Eleanor Hayes' },
      { tag: '{{registration_no}}', label: 'Registration No', sample: 'REG-2023-991' },
      { tag: '{{admission_date}}', label: 'Admission Date', sample: '15 January 2023' },
      { tag: '{{leaving_date}}', label: 'Leaving Date', sample: '10 October 2026' },
      { tag: '{{last_class_passed}}', label: 'Last Class Studied', sample: 'Grade 10 (Secondary)' },
      { tag: '{{promoted_class}}', label: 'Promoted To Class', sample: 'Promoted to Grade 11' },
      { tag: '{{dues_cleared}}', label: 'Dues Status', sample: 'All school dues cleared up to October 2026' },
      { tag: '{{conduct}}', label: 'Character & Conduct', sample: 'Exemplary and Satisfactory' },
      { tag: '{{reason_for_leaving}}', label: 'Reason for Leaving', sample: 'Relocation of parents' },
      { tag: '{{issue_date}}', label: 'Issue Date', sample: '12 October 2026' },
      { tag: '{{school_name}}', label: 'School Name', sample: 'Sky International Academy' },
      { tag: '{{school_address}}', label: 'School Address', sample: '100 Enterprise Way, Academic Campus' },
    ],
    html_content: `<div class="tc-page">
  <div class="tc-border-frame">
    <div class="tc-header">
      <h1 class="tc-school-title">{{school_name}}</h1>
      <p class="tc-school-address">{{school_address}}</p>
      <div class="tc-title-banner">
        <h2>TRANSFER CERTIFICATE</h2>
      </div>
      <div class="tc-meta-row">
        <span>Serial No: <strong class="font-mono">{{tc_serial}}</strong></span>
        <span>Issue Date: <strong>{{issue_date}}</strong></span>
      </div>
    </div>

    <div class="tc-body">
      <table class="tc-table">
        <tbody>
          <tr><td class="col-num">1.</td><td class="col-label">Name of Student:</td><td class="col-val highlight">{{student_name}}</td></tr>
          <tr><td class="col-num">2.</td><td class="col-label">Father's / Guardian's Name:</td><td class="col-val">{{father_name}}</td></tr>
          <tr><td class="col-num">3.</td><td class="col-label">Mother's Name:</td><td class="col-val">{{mother_name}}</td></tr>
          <tr><td class="col-num">4.</td><td class="col-label">Institutional Registration No:</td><td class="col-val font-mono">{{registration_no}}</td></tr>
          <tr><td class="col-num">5.</td><td class="col-label">Date of First Admission:</td><td class="col-val">{{admission_date}}</td></tr>
          <tr><td class="col-num">6.</td><td class="col-label">Class in which student last studied:</td><td class="col-val font-bold">{{last_class_passed}}</td></tr>
          <tr><td class="col-num">7.</td><td class="col-label">Whether qualified for promotion:</td><td class="col-val">{{promoted_class}}</td></tr>
          <tr><td class="col-num">8.</td><td class="col-label">Month up to which school dues paid:</td><td class="col-val">{{dues_cleared}}</td></tr>
          <tr><td class="col-num">9.</td><td class="col-label">Date of student's departure:</td><td class="col-val">{{leaving_date}}</td></tr>
          <tr><td class="col-num">10.</td><td class="col-label">Reason for leaving the institution:</td><td class="col-val">{{reason_for_leaving}}</td></tr>
          <tr><td class="col-num">11.</td><td class="col-label">General Conduct & Character:</td><td class="col-val font-bold text-success">{{conduct}}</td></tr>
        </tbody>
      </table>

      <p class="tc-certification-statement">
        Certified that the above particulars are in accordance with the official school register and records.
      </p>
    </div>

    <div class="tc-signatures">
      <div class="sig-column">
        <div class="line"></div>
        <p>Prepared By / Clerk</p>
      </div>
      <div class="seal-column">
        <div class="seal-circle">INSTITUTION SEAL</div>
      </div>
      <div class="sig-column">
        <div class="line"></div>
        <p>Principal / Headmaster</p>
      </div>
    </div>
  </div>
</div>`,
    css_content: `.tc-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #ffffff;
  padding: 16px;
  font-family: "Georgia", "Times New Roman", serif;
  color: #1e293b;
}
.tc-border-frame {
  border: 4px double #1e3a8a;
  border-radius: 4px;
  height: 100%;
  box-sizing: border-box;
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.tc-header {
  text-align: center;
  border-bottom: 2px solid #1e3a8a;
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.tc-school-title {
  font-size: 24px;
  font-weight: 800;
  color: #1e3a8a;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.tc-school-address {
  font-size: 11px;
  color: #64748b;
  margin: 4px 0 10px;
  font-family: sans-serif;
}
.tc-title-banner h2 {
  display: inline-block;
  background: #1e3a8a;
  color: #ffffff;
  padding: 6px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 6px 0;
}
.tc-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #334155;
  margin-top: 8px;
  font-family: sans-serif;
}
.tc-body {
  flex: 1;
}
.tc-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 12px;
}
.tc-table tr {
  border-bottom: 1px solid #e2e8f0;
}
.tc-table td {
  padding: 8px 6px;
  vertical-align: middle;
}
.col-num {
  width: 25px;
  font-weight: bold;
  color: #64748b;
}
.col-label {
  width: 260px;
  color: #475569;
}
.col-val {
  color: #0f172a;
}
.highlight {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a8a;
}
.tc-certification-statement {
  font-size: 11.5px;
  font-style: italic;
  color: #475569;
  margin-top: 20px;
  text-align: center;
}
.tc-signatures {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 30px;
  margin-top: auto;
  font-family: sans-serif;
}
.sig-column {
  text-align: center;
  width: 160px;
}
.sig-column .line {
  border-bottom: 1.5px solid #1e293b;
  margin-bottom: 6px;
}
.sig-column p {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: #334155;
}
.seal-column .seal-circle {
  width: 90px;
  height: 90px;
  border: 2px dashed #94a3b8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 9px;
  font-weight: bold;
  color: #94a3b8;
  letter-spacing: 1px;
}`,
  },

  // 4. Testimonial - A4 Portrait (210mm x 297mm)
  {
    name: 'Presidential Academic Testimonial',
    slug: 'presidential-academic-testimonial',
    category: 'testimonial',
    description: 'Distinguished commendation letter verifying student character, academic GPA, passing year, and behavior.',
    dimension_width: 210,
    dimension_height: 297,
    dimension_unit: 'mm',
    orientation: 'portrait',
    available_merge_tags: [
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Sophia Alverez' },
      { tag: '{{father_name}}', label: 'Father Name', sample: 'Carlos Alverez' },
      { tag: '{{mother_name}}', label: 'Mother Name', sample: 'Maria Alverez' },
      { tag: '{{registration_no}}', label: 'Registration No', sample: 'REG-2022-7741' },
      { tag: '{{examination_name}}', label: 'Examination', sample: 'Secondary School Certificate (SSC)' },
      { tag: '{{passing_year}}', label: 'Passing Year', sample: '2026' },
      { tag: '{{gpa}}', label: 'GPA / Result', sample: '5.00 (A+)' },
      { tag: '{{session_name}}', label: 'Session', sample: '2024 - 2026' },
      { tag: '{{conduct}}', label: 'Character & Conduct', sample: 'praiseworthy and exemplary' },
      { tag: '{{issue_date}}', label: 'Date of Issuance', sample: '12 October 2026' },
      { tag: '{{school_name}}', label: 'School Name', sample: 'Sky International Academy' },
    ],
    html_content: `<div class="testimonial-page">
  <div class="testimonial-inner-frame">
    <div class="tm-header">
      <h1 class="tm-school-name">{{school_name}}</h1>
      <p class="tm-tagline">Excellence in Knowledge, Character & Leadership</p>
      <div class="divider-ribbon"></div>
      <h2 class="tm-document-title">TESTIMONIAL</h2>
    </div>

    <div class="tm-content">
      <p class="tm-paragraph">
        This is to certify that <strong>{{student_name}}</strong>, daughter/son of <strong>{{father_name}}</strong> and <strong>{{mother_name}}</strong>, bearing Registration Number <strong class="font-mono">{{registration_no}}</strong>, was a bona fide student of this prestigious institution during academic session <strong>{{session_name}}</strong>.
      </p>

      <p class="tm-paragraph">
        She/He participated in the <strong>{{examination_name}}</strong> in the year <strong>{{passing_year}}</strong> and successfully passed with an outstanding Grade Point Average of <strong class="badge-gpa">{{gpa}}</strong>.
      </p>

      <p class="tm-paragraph">
        To the best of my knowledge and official institutional records, she/he bears a <strong>{{conduct}}</strong> moral character and demonstrated active participation in co-curricular pursuits. She/He did not take part in any activity subversive of law or institution discipline.
      </p>

      <p class="tm-wish">I wish her/him every success and prosperity in future academic and professional endeavors.</p>
    </div>

    <div class="tm-footer">
      <div class="date-block">
        <p>Date: <strong>{{issue_date}}</strong></p>
        <p>Place: Campus Secretariat</p>
      </div>
      <div class="seal-block">
        <div class="seal-placeholder">OFFICIAL EMBOSS</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sign-title">Principal & Head of Institute</p>
        <p class="sign-inst">{{school_name}}</p>
      </div>
    </div>
  </div>
</div>`,
    css_content: `.testimonial-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #fdfbf7;
  padding: 24px;
  font-family: "Georgia", serif;
  color: #1e293b;
}
.testimonial-inner-frame {
  border: 2px solid #b45309;
  outline: 6px solid #fef3c7;
  height: 100%;
  box-sizing: border-box;
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
}
.tm-header {
  text-align: center;
  margin-bottom: 24px;
}
.tm-school-name {
  font-size: 26px;
  color: #78350f;
  margin: 0;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 1px;
}
.tm-tagline {
  font-size: 11px;
  color: #92400e;
  font-style: italic;
  margin: 4px 0 12px;
}
.divider-ribbon {
  height: 2px;
  background: linear-gradient(90deg, transparent, #b45309, transparent);
  margin: 0 auto 16px;
  width: 80%;
}
.tm-document-title {
  font-size: 20px;
  color: #92400e;
  letter-spacing: 4px;
  font-weight: 700;
  margin: 0;
}
.tm-content {
  flex: 1;
  font-size: 13.5px;
  line-height: 2;
  text-align: justify;
}
.tm-paragraph {
  margin-bottom: 16px;
  text-indent: 28px;
}
.badge-gpa {
  color: #b45309;
  font-size: 14.5px;
}
.tm-wish {
  margin-top: 24px;
  font-style: italic;
  color: #451a03;
  text-align: center;
}
.tm-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 24px;
  margin-top: auto;
  font-size: 11px;
}
.seal-placeholder {
  width: 80px;
  height: 80px;
  border: 1px dashed #d97706;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d97706;
  font-size: 8px;
  text-align: center;
}
.sig-block {
  text-align: center;
  width: 180px;
}
.sig-block .sig-line {
  border-bottom: 1.5px solid #78350f;
  margin-bottom: 6px;
}
.sign-title {
  margin: 0;
  font-weight: 700;
  color: #78350f;
}
.sign-inst {
  margin: 2px 0 0;
  color: #92400e;
  font-size: 9.5px;
}`,
  },

  // 5. Academic & Merit Certificate - A4 Landscape (297mm x 210mm)
  {
    name: 'Gold Excellence Award Certificate',
    slug: 'gold-excellence-award-certificate',
    category: 'certificate',
    description: 'Gold-framed landscape certificate of excellence and achievement for academics, competitions, and milestones.',
    dimension_width: 297,
    dimension_height: 210,
    dimension_unit: 'mm',
    orientation: 'landscape',
    available_merge_tags: [
      { tag: '{{recipient_name}}', label: 'Recipient Name', sample: 'Elena Rostova' },
      { tag: '{{award_title}}', label: 'Award Title', sample: 'Academic Excellence Award' },
      { tag: '{{achievement_description}}', label: 'Citation / Reason', sample: 'For achieving first rank in the Annual STEM Olympiad with distinguished performance.' },
      { tag: '{{certificate_no}}', label: 'Certificate No', sample: 'CERT-2026-8802' },
      { tag: '{{event_date}}', label: 'Award Date', sample: '12 October 2026' },
      { tag: '{{school_name}}', label: 'School / Institution', sample: 'Sky International Academy' },
    ],
    html_content: `<div class="certificate-page">
  <div class="cert-gold-border">
    <div class="cert-inner-frame">
      <div class="cert-header">
        <p class="cert-institution">{{school_name}}</p>
        <h1 class="cert-main-title">Certificate of Achievement</h1>
        <p class="cert-subtitle">PROUDLY PRESENTED TO</p>
      </div>

      <div class="cert-recipient-block">
        <h2 class="recipient-name">{{recipient_name}}</h2>
        <div class="name-underline"></div>
      </div>

      <div class="cert-body">
        <p class="cert-reason">
          In honor of outstanding dedication and exceptional accomplishment in
          <strong>{{award_title}}</strong>. {{achievement_description}}
        </p>
      </div>

      <div class="cert-footer">
        <div class="sig-col">
          <div class="sig-line"></div>
          <p class="signer-role">Academic Director</p>
        </div>
        <div class="seal-rosette">
          <div class="rosette-circle">
            <span>OFFICIAL</span>
            <strong>MERIT</strong>
          </div>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <p class="signer-role">President & Principal</p>
        </div>
      </div>

      <div class="cert-id-tag">
        <span>No: <strong class="font-mono">{{certificate_no}}</strong></span>
        <span>Date: <strong>{{event_date}}</strong></span>
      </div>
    </div>
  </div>
</div>`,
    css_content: `.certificate-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #fdfbf7;
  padding: 12px;
  font-family: "Georgia", serif;
  color: #1e293b;
}
.cert-gold-border {
  border: 6px solid #d97706;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  background: #ffffff;
}
.cert-inner-frame {
  border: 2px dashed #b45309;
  height: 100%;
  box-sizing: border-box;
  padding: 24px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}
.cert-institution {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #78350f;
  margin: 0;
}
.cert-main-title {
  font-size: 32px;
  font-weight: 800;
  color: #b45309;
  margin: 6px 0 2px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}
.cert-subtitle {
  font-size: 10px;
  letter-spacing: 3px;
  color: #92400e;
  margin: 4px 0 12px;
  font-weight: 600;
}
.recipient-name {
  font-size: 28px;
  font-weight: 700;
  color: #1e3a8a;
  margin: 0;
  font-family: "Times New Roman", serif;
}
.name-underline {
  width: 280px;
  height: 2px;
  background: #d97706;
  margin: 6px auto 14px;
}
.cert-reason {
  font-size: 12px;
  line-height: 1.7;
  max-width: 620px;
  color: #475569;
  margin: 0;
}
.cert-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;
  padding: 0 20px;
}
.sig-col {
  width: 160px;
}
.sig-col .sig-line {
  border-bottom: 1.5px solid #1e293b;
  margin-bottom: 4px;
}
.signer-role {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
}
.rosette-circle {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: #fef3c7;
  border: 2px solid #d97706;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #92400e;
}
.cert-id-tag {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 8.5px;
  color: #94a3b8;
  margin-top: 8px;
}`,
  },

  // 6. Payment Receipt - Half-A4 / POS (210mm x 148mm)
  {
    name: 'Institutional Fee Payment Receipt',
    slug: 'institutional-fee-payment-receipt',
    category: 'payment_receipt',
    description: 'Structured cash & tuition payment receipt with fee itemization, invoice number, and cashier authorization.',
    dimension_width: 210,
    dimension_height: 148,
    dimension_unit: 'mm',
    orientation: 'landscape',
    available_merge_tags: [
      { tag: '{{receipt_no}}', label: 'Receipt No', sample: 'REC-2026-9041' },
      { tag: '{{payment_date}}', label: 'Date', sample: '12 Oct 2026' },
      { tag: '{{student_name}}', label: 'Student Name', sample: 'Liam Hemsworth' },
      { tag: '{{registration_no}}', label: 'Reg No', sample: 'REG-2025-014' },
      { tag: '{{class_name}}', label: 'Class / Section', sample: 'Class 9 (Sec A)' },
      { tag: '{{fee_month}}', label: 'Fee Month / Term', sample: 'October 2026' },
      { tag: '{{total_amount}}', label: 'Total Amount', sample: '$450.00' },
      { tag: '{{discount}}', label: 'Discount / Waiver', sample: '$0.00' },
      { tag: '{{paid_amount}}', label: 'Paid Amount', sample: '$450.00' },
      { tag: '{{due_balance}}', label: 'Due Balance', sample: '$0.00' },
      { tag: '{{payment_method}}', label: 'Payment Mode', sample: 'Online (bKash / Card)' },
      { tag: '{{school_name}}', label: 'Institution Name', sample: 'Sky International Academy' },
    ],
    html_content: `<div class="receipt-wrapper">
  <div class="receipt-header">
    <div class="receipt-brand">
      <h2>{{school_name}}</h2>
      <p>Official Student Fee & Billing Receipt</p>
    </div>
    <div class="receipt-meta">
      <div class="pill">RECEIPT # {{receipt_no}}</div>
      <p class="date-txt">Date: {{payment_date}}</p>
    </div>
  </div>

  <div class="student-bar">
    <div class="bar-col"><span>Student:</span> <strong>{{student_name}}</strong></div>
    <div class="bar-col"><span>Reg No:</span> <strong class="font-mono">{{registration_no}}</strong></div>
    <div class="bar-col"><span>Class:</span> <strong>{{class_name}}</strong></div>
    <div class="bar-col"><span>Term:</span> <strong>{{fee_month}}</strong></div>
  </div>

  <table class="receipt-table">
    <thead>
      <tr>
        <th>SL</th>
        <th>Fee Description</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>Monthly Tuition & Academic Coaching</td><td class="text-right">$300.00</td></tr>
      <tr><td>2</td><td>Science Lab & ICT Facility Access</td><td class="text-right">$100.00</td></tr>
      <tr><td>3</td><td>Library & Co-Curricular Assessment Fee</td><td class="text-right">$50.00</td></tr>
    </tbody>
  </table>

  <div class="receipt-summary">
    <div class="method-box">
      <p>Method: <strong>{{payment_method}}</strong></p>
      <span class="paid-stamp">PAID & VERIFIED</span>
    </div>
    <div class="totals-box">
      <div class="tot-row"><span>Total Payable:</span> <strong>{{total_amount}}</strong></div>
      <div class="tot-row"><span>Discount / Waiver:</span> <span>{{discount}}</span></div>
      <div class="tot-row highlight"><span>Amount Paid:</span> <strong>{{paid_amount}}</strong></div>
      <div class="tot-row"><span>Balance Due:</span> <span class="font-mono">{{due_balance}}</span></div>
    </div>
  </div>

  <div class="receipt-footer">
    <span>System generated computerized receipt • No physical signature required</span>
    <span>Authorized Cashier</span>
  </div>
</div>`,
    css_content: `.receipt-wrapper {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #ffffff;
  padding: 16px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  border: 1px dashed #cbd5e1;
}
.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 8px;
}
.receipt-brand h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
}
.receipt-brand p {
  margin: 2px 0 0;
  font-size: 9.5px;
  color: #64748b;
}
.receipt-meta {
  text-align: right;
}
.receipt-meta .pill {
  background: #0f172a;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: monospace;
}
.date-txt {
  margin: 3px 0 0;
  font-size: 9px;
  color: #64748b;
}
.student-bar {
  display: flex;
  justify-content: space-between;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  margin: 8px 0;
  font-size: 9.5px;
}
.bar-col span {
  color: #64748b;
}
.receipt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 4px 0 8px;
}
.receipt-table th {
  background: #f1f5f9;
  padding: 5px 8px;
  text-align: left;
  font-size: 9px;
  text-transform: uppercase;
  color: #475569;
}
.receipt-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f1f5f9;
}
.receipt-table .text-right {
  text-align: right;
}
.receipt-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 6px;
}
.method-box p {
  margin: 0;
  font-size: 9.5px;
  color: #475569;
}
.paid-stamp {
  display: inline-block;
  margin-top: 4px;
  color: #059669;
  border: 1.5px solid #059669;
  font-size: 8px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}
.totals-box {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tot-row {
  display: flex;
  justify-content: space-between;
  font-size: 9.5px;
}
.tot-row.highlight {
  font-size: 11px;
  color: #059669;
  border-top: 1px solid #cbd5e1;
  padding-top: 2px;
}
.receipt-footer {
  margin-top: 10px;
  padding-top: 6px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #94a3b8;
}`,
  },

  // 7. Website Poster - Square Social Banner (1080px x 1080px)
  {
    name: 'Modern Campus Admission & Event Poster',
    slug: 'modern-campus-admission-event-poster',
    category: 'poster',
    description: 'High-impact visual promotional poster for admission circulars, exhibitions, and sports gala.',
    dimension_width: 1080,
    dimension_height: 1080,
    dimension_unit: 'px',
    orientation: 'portrait',
    available_merge_tags: [
      { tag: '{{poster_title}}', label: 'Headline Title', sample: 'ADMISSIONS OPEN 2026-2027' },
      { tag: '{{poster_subtitle}}', label: 'Subtitle', sample: 'Playgroup to Grade 12 • World-Class Cambridge Curriculum' },
      { tag: '{{event_date}}', label: 'Deadline / Date', sample: 'Apply Before Nov 15, 2026' },
      { tag: '{{venue}}', label: 'Campus Location', sample: 'Main Campus, 100 Enterprise Way' },
      { tag: '{{contact_phone}}', label: 'Hotline Contact', sample: '+1 (800) 555-0199' },
      { tag: '{{website_url}}', label: 'Website / Apply Link', sample: 'www.sky-academy.edu' },
      { tag: '{{school_name}}', label: 'School Name', sample: 'Sky International Academy' },
    ],
    html_content: `<div class="poster-canvas">
  <div class="poster-top">
    <span class="inst-pill">{{school_name}}</span>
    <span class="session-pill">FALL SESSION INTAKE</span>
  </div>

  <div class="poster-hero">
    <h1 class="poster-headline">{{poster_title}}</h1>
    <p class="poster-sub">{{poster_subtitle}}</p>
  </div>

  <div class="features-row">
    <div class="feat-card">
      <span class="icon">🔬</span>
      <h4>Advanced STEM Labs</h4>
    </div>
    <div class="feat-card">
      <span class="icon">🏆</span>
      <h4>Olympic Sports Complex</h4>
    </div>
    <div class="feat-card">
      <span class="icon">🌍</span>
      <h4>Global University Tie-ups</h4>
    </div>
  </div>

  <div class="poster-cta-box">
    <div class="cta-info">
      <span class="cta-label">Registration Window:</span>
      <h3 class="cta-val">{{event_date}}</h3>
      <p class="cta-venue">{{venue}}</p>
    </div>
    <div class="contact-pill">
      <span>HOTLINE: {{contact_phone}}</span>
      <strong>{{website_url}}</strong>
    </div>
  </div>
</div>`,
    css_content: `.poster-canvas {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: radial-gradient(circle at top right, #1e3a8a, #0f172a 70%);
  color: #ffffff;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.poster-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.inst-pill {
  background: #3b82f6;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 9999px;
  letter-spacing: 1px;
}
.session-pill {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
}
.poster-hero {
  margin: 32px 0;
}
.poster-headline {
  font-size: 52px;
  font-weight: 900;
  line-height: 1.1;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-transform: uppercase;
}
.poster-sub {
  font-size: 18px;
  color: #bfdbfe;
  margin: 16px 0 0;
  max-width: 600px;
}
.features-row {
  display: flex;
  gap: 16px;
  margin: 24px 0;
}
.feat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}
.feat-card .icon {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
}
.feat-card h4 {
  margin: 0;
  font-size: 13px;
  color: #ffffff;
}
.poster-cta-box {
  background: linear-gradient(90deg, #1d4ed8, #2563eb);
  border-radius: 20px;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}
.cta-label {
  font-size: 11px;
  letter-spacing: 1.5px;
  color: #bfdbfe;
  text-transform: uppercase;
}
.cta-val {
  margin: 4px 0;
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
}
.cta-venue {
  margin: 0;
  font-size: 12px;
  color: #dbeafe;
}
.contact-pill {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.contact-pill span {
  font-size: 13px;
  color: #e0e7ff;
}
.contact-pill strong {
  font-size: 15px;
  color: #ffffff;
}`,
  },
];

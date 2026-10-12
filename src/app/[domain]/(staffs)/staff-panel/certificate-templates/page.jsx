'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function CertificateTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="certificate"
      categoryLabel="Academic Certificate"
      description="Browse honors, graduation, and merit certificate templates designed in the Studio, preview sample layouts, and activate your school default."
      downloadRoute="/staff-panel/certificates"
      sampleReplacements={{
        '{{student_name}}': 'Julianna Hayes',
        '{{award_title}}': 'Certificate of Academic Distinction & Excellence',
        '{{reason_text}}': 'For achieving outstanding scholastic accomplishment, exemplary leadership, and perfect disciplinary standing throughout the academic calendar.',
        '{{recipient_id}}': 'REG-2023-084',
        '{{issue_date}}': 'October 12, 2026',
        '{{signatory_one}}': 'Prof. Edward Vance, Chancellor',
        '{{signatory_two}}': 'Dr. Julian Sterling, Headmaster',
      }}
    />
  );
}

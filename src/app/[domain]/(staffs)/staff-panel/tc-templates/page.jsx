'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function TransferCertificateTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="tc"
      categoryLabel="Transfer Certificate (TC)"
      description="Browse academic departure and transfer certificate templates designed in the Studio, preview sample layouts, and activate your school default."
      downloadRoute="/staff-panel/tc"
      sampleReplacements={{
        '{{tc_serial}}': 'TC-2026-9041',
        '{{student_name}}': 'Julianna Hayes',
        '{{father_name}}': 'Robert Hayes',
        '{{mother_name}}': 'Eleanor Hayes',
        '{{registration_no}}': 'REG-2023-084',
        '{{admission_date}}': '15 January 2023',
        '{{leaving_date}}': '12 October 2026',
        '{{last_class_passed}}': 'Grade 10 (Secondary)',
        '{{promoted_class}}': 'Promoted to Grade 11 (Higher Secondary)',
        '{{dues_cleared}}': 'All school dues cleared up to current month',
        '{{conduct}}': 'Exemplary, diligent, and commendable',
        '{{reason_for_leaving}}': 'Relocation of parents / Guardians request',
      }}
    />
  );
}

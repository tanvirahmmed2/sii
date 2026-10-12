'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function PosterTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="poster"
      categoryLabel="Website Poster"
      description="Browse promotional, admissions, and event poster templates designed in the Studio, preview sample layouts, and activate your school default."
      downloadRoute="/staff-panel/posters"
      sampleReplacements={{
        '{{headline}}': 'Admissions Open for Session 2026-2027',
        '{{subheadline}}': 'Empowering Tomorrow’s Leaders with Global Standard Education',
        '{{event_date}}': 'Apply by November 30, 2026',
        '{{venue}}': 'Main Campus Auditorium & Online Portal',
        '{{call_to_action}}': 'Apply Now at our Admissions Portal',
      }}
    />
  );
}

'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function TestimonialTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="testimonial"
      categoryLabel="Testimonial"
      description="Browse academic testimonial and commendation templates designed in the Studio, preview sample layouts, and activate your school default."
      downloadRoute="/staff-panel/testimonials"
      sampleReplacements={{
        '{{student_name}}': 'Julianna Hayes',
        '{{father_name}}': 'Robert Hayes',
        '{{mother_name}}': 'Eleanor Hayes',
        '{{exam_name}}': 'Secondary School Certificate (SSC)',
        '{{passing_year}}': '2026',
        '{{gpa}}': '5.00 (Grade A+)',
        '{{session}}': '2024 - 2026',
        '{{conduct}}': 'praiseworthy, disciplined and exemplary',
      }}
    />
  );
}

'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function TeacherIdCardTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="teacher_id_card"
      categoryLabel="Teacher ID Card"
      description="Browse faculty & staff identity card templates designed in the Studio, preview sample layouts, and activate your school default."
      downloadRoute="/staff-panel/teacher-id-card-download"
      sampleReplacements={{
        '{{teacher_name}}': 'Dr. Alistair Vance, Ph.D.',
        '{{designation}}': 'Senior Professor & Dean of Science',
        '{{department}}': 'Physics & Computational Sciences',
        '{{employee_id}}': 'EMP-2024-0082',
        '{{blood_group}}': 'A+',
        '{{teacher_photo}}': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        '{{valid_upto}}': 'December 2028',
      }}
    />
  );
}

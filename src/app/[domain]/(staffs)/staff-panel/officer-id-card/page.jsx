'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function OfficerIdCardTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="officer_id_card"
      categoryLabel="Officer ID Card"
      description="Browse administrative & campus officer identity card templates designed in the Studio, preview layouts, and activate your school default."
      downloadRoute="/staff-panel/officer-id-card-download"
      sampleReplacements={{
        '{{officer_name}}': 'Mohammad Rafiqul Islam',
        '{{designation}}': 'Senior Administrative Officer',
        '{{department}}': 'Administration & Accounts',
        '{{employee_id}}': 'OFF-2024-0012',
        '{{phone}}': '+880 1711-234567',
        '{{blood_group}}': 'B+',
        '{{officer_photo}}': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        '{{valid_upto}}': 'December 2028',
      }}
    />
  );
}

'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function AdmissionAdmitCardTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="admit_card"
      categoryLabel="Admit Card &amp; Hall Ticket"
      description="Browse admission exam admit card and hall ticket vector layouts designed in the Studio, verify sample candidate credentials, and activate your school default."
      downloadRoute="/admission/admit-card"
      sampleReplacements={{
        '{{applicant_name}}': 'Tanvir Hossain',
        '{{application_no}}': 'APP-2026-9081',
        '{{exam_roll}}': 'EXAM-10492',
        '{{roll_no}}': 'EXAM-10492',
        '{{father_name}}': 'Muhammad Ali Hossain',
        '{{mother_name}}': 'Fatema Begum',
        '{{date_of_birth}}': '15 Aug 2008',
        '{{gender}}': 'Male',
        '{{phone}}': '+880 1700-112233',
        '{{email}}': 'applicant@example.com',
        '{{class_name}}': 'Class 11 (Science)',
        '{{session_name}}': '2026-2027',
        '{{circular_title}}': 'Higher Secondary Admission 2026',
        '{{exam_date}}': 'Saturday, 15 Nov 2026',
        '{{exam_time}}': '10:00 AM - 12:00 PM',
        '{{exam_venue}}': 'Main Academic Building, Hall 402',
        '{{candidate_photo}}': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        '{{candidate_signature}}': '',
        '{{qr_code}}': 'APP-2026-9081',
      }}
    />
  );
}

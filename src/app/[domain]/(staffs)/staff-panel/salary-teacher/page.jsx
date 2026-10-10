'use client';

import React from 'react';
import SalaryAssignmentManager from 'src/component/website/admin/payroll/SalaryAssignmentManager';

export default function SalaryTeacherPage() {
  return (
    <SalaryAssignmentManager
      roleType="teacher"
      title="Teacher Salary Assignments"
      subtitle="Map institutional payroll scales and grade structures to academic teaching staff."
    />
  );
}

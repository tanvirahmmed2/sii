'use client';

import React from 'react';
import SalaryAssignmentManager from 'src/component/website/admin/payroll/SalaryAssignmentManager';

export default function SalaryOfficersPage() {
  return (
    <SalaryAssignmentManager
      roleType="officer"
      title="Officer Salary Assignments"
      subtitle="Map institutional payroll scales and grade structures to administrative officers."
    />
  );
}

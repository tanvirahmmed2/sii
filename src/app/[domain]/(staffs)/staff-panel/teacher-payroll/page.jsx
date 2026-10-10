'use client';

import React from 'react';
import PayrollsScaleManager from 'src/component/website/admin/payroll/PayrollsScaleManager';

export default function TeacherPayrollPage() {
  return (
    <PayrollsScaleManager
      roleType="teacher"
      title="Teacher Payroll Scales"
      subtitle="Standard salary grade scales and allowance configurations for academic staff."
    />
  );
}

'use client';

import React from 'react';
import PayrollsScaleManager from 'src/component/website/staff/payroll/PayrollsScaleManager';

export default function OfficerPayrollPage() {
  return (
    <PayrollsScaleManager
      roleType="officer"
      title="Officer Payroll Scales"
      subtitle="Standard salary grade scales, allowance structures, and deductions for administrative officers."
    />
  );
}

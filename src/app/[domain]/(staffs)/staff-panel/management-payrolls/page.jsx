'use client';

import React from 'react';
import PayrollsScaleManager from 'src/component/website/admin/payroll/PayrollsScaleManager';

export default function ManagementPayrollsPage() {
  return (
    <PayrollsScaleManager
      roleType="officer"
      title="Officer Payroll Scales"
      subtitle="Standard salary grade scales and allowance configurations for administrative officers."
    />
  );
}

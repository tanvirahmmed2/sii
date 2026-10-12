'use client';

import React from 'react';
import SalaryPaymentsManager from 'src/component/website/staff/payroll/SalaryPaymentsManager';

export default function SalaryOfficerPaymentsPage() {
  return (
    <SalaryPaymentsManager
      roleType="officer"
      title="Officer Salary Payments"
      subtitle="Monthly salary disbursement ledger, payslips generation, and transaction payment tracking for officers."
    />
  );
}

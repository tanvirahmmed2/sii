'use client';

import React from 'react';
import SalaryPaymentsManager from 'src/component/website/admin/payroll/SalaryPaymentsManager';

export default function SalaryTeacherPaymentsPage() {
  return (
    <SalaryPaymentsManager
      roleType="teacher"
      title="Teacher Salary Payments"
      subtitle="Monthly salary disbursement ledger, payslips generation, and transaction payment tracking for teachers."
    />
  );
}

'use client';

import React from 'react';
import StaffCategoryTemplatePicker from 'src/component/staff/StaffCategoryTemplatePicker';

export default function PaymentReceiptTemplatesPage() {
  return (
    <StaffCategoryTemplatePicker
      category="payment_receipt"
      categoryLabel="Payment Receipt"
      description="Browse student fee, tuition, and admissions payment voucher templates designed in the Studio, preview sample layouts, and activate your school default."
      downloadRoute="/staff-panel/payment-receipt"
      sampleReplacements={{
        '{{receipt_no}}': 'REC-2026-8812',
        '{{student_name}}': 'Julianna Hayes',
        '{{student_id}}': 'REG-2023-084',
        '{{class_name}}': 'Grade 10 (Sec A)',
        '{{fee_month}}': 'October 2026',
        '{{amount_paid}}': '3,500 BDT',
        '{{payment_method}}': 'bKash Merchant Pay',
        '{{transaction_id}}': 'TRX-9BK882194',
        '{{received_by}}': 'Accounts Secretariat',
      }}
    />
  );
}

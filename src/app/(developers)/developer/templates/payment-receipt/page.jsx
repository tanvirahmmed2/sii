'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function PaymentReceiptTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="payment_receipt"
      title="Payment & Fee Receipt Templates"
      description="Design fee collection vouchers, line items billing slips, and thermal receipt layouts."
      defaultDimensions={{ width: 210, height: 148, unit: 'mm', orientation: 'landscape' }}
    />
  );
}

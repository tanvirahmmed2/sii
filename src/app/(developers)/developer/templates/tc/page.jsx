'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function TransferCertificateTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="tc"
      title="Transfer Certificate (TC) Templates"
      description="Design formal institutional Transfer Certificate sheets with borders, serial blocks, and signature seals."
      defaultDimensions={{ width: 210, height: 297, unit: 'mm', orientation: 'portrait' }}
    />
  );
}

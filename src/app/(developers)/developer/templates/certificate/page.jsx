'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function CertificateTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="certificate"
      title="Academic & Merit Certificate Templates"
      description="Design framed landscape certificates of excellence, competition honors, and participation awards."
      defaultDimensions={{ width: 297, height: 210, unit: 'mm', orientation: 'landscape' }}
    />
  );
}

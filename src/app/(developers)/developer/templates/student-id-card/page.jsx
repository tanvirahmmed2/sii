'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function StudentIdCardTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="student_id_card"
      title="Student ID Card Templates"
      description="Design, customize, and maintain standard CR80 student identity card templates."
      defaultDimensions={{ width: 54, height: 86, unit: 'mm', orientation: 'portrait' }}
    />
  );
}

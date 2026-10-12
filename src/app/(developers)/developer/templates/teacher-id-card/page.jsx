'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function TeacherIdCardTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="teacher_id_card"
      title="Teacher & Faculty ID Card Templates"
      description="Design and manage official faculty passes, employee badges, and teacher identification layouts."
      defaultDimensions={{ width: 86, height: 54, unit: 'mm', orientation: 'landscape' }}
    />
  );
}

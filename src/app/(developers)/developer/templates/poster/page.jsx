'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function WebsitePosterTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="poster"
      title="Website & Social Poster Templates"
      description="Design promotional posters, admission circular banners, and institutional event announcements."
      defaultDimensions={{ width: 1080, height: 1080, unit: 'px', orientation: 'portrait' }}
    />
  );
}

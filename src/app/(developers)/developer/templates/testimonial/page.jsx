'use client';

import React from 'react';
import CategoryTemplateManager from 'src/component/developer/templates/CategoryTemplateManager';

export default function TestimonialTemplatesPage() {
  return (
    <CategoryTemplateManager
      category="testimonial"
      title="Academic Testimonial Templates"
      description="Design formal graduation commendation and academic character testimonial letterheads."
      defaultDimensions={{ width: 210, height: 297, unit: 'mm', orientation: 'portrait' }}
    />
  );
}

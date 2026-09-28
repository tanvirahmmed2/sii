'use client';

import React from 'react';
import GoogleTranslate from 'next-google-translate-widget';
import 'next-google-translate-widget/styles';
import { BiGlobe } from 'react-icons/bi';

/**
 * 5 supported languages:
 * 1. English (default) - en
 * 2. Bangla - bn
 * 3. Spanish - es
 * 4. Hindi - hi
 * 5. German - de
 */
export const SUPPORTED_LANGUAGES = [
  { label: 'English', value: 'en', flag: 'us' },
  { label: 'বাংলা (Bangla)', value: 'bn', flag: 'bd' },
  { label: 'Español (Spanish)', value: 'es', flag: 'es' },
  { label: 'हिन्दी (Hindi)', value: 'hi', flag: 'in' },
  { label: 'Deutsch (German)', value: 'de', flag: 'de' },
];

export default function TranslateButton({
  align = 'right',
  showLabel = false,
  variant = 'dark', // 'dark' | 'auto'
  className = '',
}) {
  const variantClass = variant === 'auto' ? 'footer-translate-widget-auto' : 'footer-translate-widget-dark';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-xs opacity-80 flex items-center gap-1 font-medium select-none pointer-events-none">
          <BiGlobe className="text-sm opacity-90" />
          <span>Translate:</span>
        </span>
      )}
      <div className={`footer-translate-widget ${variantClass}`}>
        <GoogleTranslate
          pageLanguage="en"
          languages={SUPPORTED_LANGUAGES}
          menuAlign={align}
        />
      </div>
    </div>
  );
}

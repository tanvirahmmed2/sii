'use client';

import React from 'react';
import GoogleTranslate from 'next-google-translate-widget';

export const WIDGET_LANGUAGES = [
  { label: 'English', value: 'en', flag: 'us' },
  { label: 'বাংলা (Bangla)', value: 'bn', flag: 'bd' },
  { label: 'Español (Spanish)', value: 'es', flag: 'es' },
  { label: 'हिन्दी (Hindi)', value: 'hi', flag: 'in' },
  { label: 'Deutsch (German)', value: 'de', flag: 'de' },
  { label: 'Français (French)', value: 'fr', flag: 'fr' },
  { label: 'العربية (Arabic)', value: 'ar', flag: 'sa' },
];

export default function TranslateButton({
  align = 'right',
  showLabel = false,
  variant = 'auto', // 'dark' | 'auto'
  className = '',
}) {
  return (
    <div className={`relative inline-flex items-center gap-2 notranslate ${className}`} translate="no">
      {showLabel && (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium select-none pointer-events-none">
          Language:
        </span>
      )}

      <div
        className={`inline-block text-xs font-medium ${
          variant === 'dark'
            ? '[&_.ngtButton]:!bg-slate-900 [&_.ngtButton]:!border-slate-700 [&_.ngtButton]:!text-slate-200 [&_.ngtButton]:!rounded [&_.ngtMenu]:!bg-slate-900 [&_.ngtMenu]:!border-slate-800 [&_.ngtMenu]:!text-slate-200 [&_.ngtMenu]:!rounded [&_.ngtButton]:!py-1 [&_.ngtButton]:!px-2.5 [&_.ngtButton]:!text-xs'
            : '[&_.ngtButton]:!rounded [&_.ngtMenu]:!rounded [&_.ngtButton]:!py-1 [&_.ngtButton]:!px-2.5 [&_.ngtButton]:!text-xs dark:[&_.ngtButton]:!bg-slate-900 dark:[&_.ngtButton]:!border-slate-800 dark:[&_.ngtButton]:!text-slate-200 dark:[&_.ngtMenu]:!bg-slate-900 dark:[&_.ngtMenu]:!border-slate-800 dark:[&_.ngtMenu]:!text-slate-200'
        }`}
      >
        <GoogleTranslate
          pageLanguage="en"
          languages={WIDGET_LANGUAGES}
          menuAlign={align === 'right' ? 'right' : 'left'}
        />
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { BiGlobe, BiChevronDown, BiCheck } from 'react-icons/bi';

export const SUPPORTED_LANGUAGES = [
  { label: 'English', value: 'en', flag: '🇺🇸' },
  { label: 'বাংলা (Bangla)', value: 'bn', flag: '🇧🇩' },
  { label: 'Español (Spanish)', value: 'es', flag: '🇪🇸' },
  { label: 'हिन्दी (Hindi)', value: 'hi', flag: '🇮🇳' },
  { label: 'Deutsch (German)', value: 'de', flag: '🇩🇪' },
];

export default function TranslateButton({
  align = 'right',
  showLabel = false,
  variant = 'dark', // 'dark' | 'auto'
  className = '',
}) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [open, setOpen] = useState(false);

  const handleSelect = (langValue) => {
    setSelectedLang(langValue);
    setOpen(false);

    // Apply Google Translate cookie if script is available
    if (typeof document !== 'undefined') {
      document.cookie = `googtrans=/en/${langValue}; path=/;`;
      // If translate element exists or page refresh is desired
      try {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
          select.value = langValue;
          select.dispatchEvent(new Event('change'));
        }
      } catch (e) {}
    }
  };

  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.value === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-xs opacity-80 flex items-center gap-1 font-medium select-none pointer-events-none">
          <BiGlobe className="text-sm opacity-90" />
          <span>Translate:</span>
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            variant === 'dark'
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          title="Select Language"
        >
          <span>{activeLang.flag}</span>
          <span>{activeLang.label}</span>
          <BiChevronDown className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            className={`absolute bottom-full mb-1 z-50 min-w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => handleSelect(lang.value)}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
                {selectedLang === lang.value && (
                  <BiCheck className="text-base text-primary font-bold" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

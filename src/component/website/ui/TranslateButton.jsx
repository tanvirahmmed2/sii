'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BiGlobe, BiChevronDown, BiCheck } from 'react-icons/bi';
import { useGoogleTranslate } from 'next-google-translate';

export const SUPPORTED_LANGUAGES = [
  { label: 'English', value: 'en|en', short: 'en', flag: '🇺🇸' },
  { label: 'বাংলা (Bangla)', value: 'en|bn', short: 'bn', flag: '🇧🇩' },
  { label: 'Español (Spanish)', value: 'en|es', short: 'es', flag: '🇪🇸' },
  { label: 'हिन्दी (Hindi)', value: 'en|hi', short: 'hi', flag: '🇮🇳' },
  { label: 'Deutsch (German)', value: 'en|de', short: 'de', flag: '🇩🇪' },
  { label: 'Français (French)', value: 'en|fr', short: 'fr', flag: '🇫🇷' },
  { label: 'العربية (Arabic)', value: 'en|ar', short: 'ar', flag: '🇸🇦' },
];

export default function TranslateButton({
  align = 'right',
  showLabel = false,
  variant = 'dark', // 'dark' | 'auto'
  className = '',
}) {
  let translateCtx = null;
  try {
    translateCtx = useGoogleTranslate();
  } catch (_) {}

  const [selectedLang, setSelectedLang] = useState('en');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Detect current language from context or cookie
    if (translateCtx?.currentLanguage) {
      setSelectedLang(translateCtx.currentLanguage);
    } else {
      try {
        const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-z]{2})/i);
        if (match && match[1]) {
          setSelectedLang(match[1].toLowerCase());
        }
      } catch (_) {}
    }

    // Click outside handler
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [translateCtx?.currentLanguage]);

  const handleSelect = (langObj) => {
    setSelectedLang(langObj.short);
    setOpen(false);

    if (translateCtx?.changeLanguage) {
      translateCtx.changeLanguage(langObj.value);
    } else if (typeof window !== 'undefined' && window.doGTranslate) {
      window.doGTranslate(langObj.value);
    } else if (typeof document !== 'undefined') {
      const hostname = window.location.hostname;
      if (langObj.short === 'en') {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        if (hostname) {
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        }
        document.cookie = 'googtrans=/en/en; path=/;';
      } else {
        document.cookie = `googtrans=/en/${langObj.short}; path=/;`;
        if (hostname) {
          document.cookie = `googtrans=/en/${langObj.short}; path=/; domain=${hostname};`;
        }
      }

      try {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
          select.value = langObj.short;
          select.dispatchEvent(new Event('change'));
          return;
        }
      } catch (_) {}

      window.location.reload();
    }
  };

  const activeLang =
    SUPPORTED_LANGUAGES.find((l) => l.short === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-2 ${className}`}>
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            variant === 'dark'
              ? 'bg-black/40 border-white/20 text-slate-200 hover:text-white hover:bg-black/60 backdrop-blur-md'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          title="Select Language"
          aria-label="Select Language"
        >
          <span>{activeLang.flag}</span>
          <span>{activeLang.label.split(' ')[0]}</span>
          <BiChevronDown className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            className={`absolute bottom-full mb-2 z-50 min-w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1.5 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => handleSelect(lang)}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
                {selectedLang === lang.short && (
                  <BiCheck className="text-base text-secondary font-bold" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

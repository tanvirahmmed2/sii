'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import GoogleTranslate, { LANGUAGES } from 'next-google-translate-widget';

export const defaultLanguages = [
  { label: 'English', value: 'en', short: 'en' },
  { label: 'বাংলা (Bangla)', value: 'bn', short: 'bn' },
  { label: 'Español (Spanish)', value: 'es', short: 'es' },
  { label: 'हिन्दी (Hindi)', value: 'hi', short: 'hi' },
  { label: 'Deutsch (German)', value: 'de', short: 'de' },
  { label: 'Français (French)', value: 'fr', short: 'fr' },
  { label: 'العربية (Arabic)', value: 'ar', short: 'ar' },
];

const GoogleTranslateContext = createContext(null);

export function GoogleTranslateProvider({
  children,
  pageLanguage = 'en',
  availableLanguages = defaultLanguages,
}) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ngt_lang') || localStorage.getItem('tenant_lang');
      if (saved) return saved;
      try {
        const match = document.cookie.match(/(?:^|;\s*)googtrans=\/(?:auto|en)\/([a-z]{2})/i);
        if (match && match[1]) return match[1].toLowerCase();
      } catch (_) {}
    }
    return pageLanguage;
  });

  const changeLanguage = useCallback((langCode) => {
    if (typeof window === 'undefined') return;
    const short = langCode.includes('|') ? langCode.split('|')[1] : langCode;
    if (short === currentLanguage) return;

    // Reset old cookies
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/`;

    if (short && short !== 'en') {
      const cookieValue = `/auto/${short}`;
      document.cookie = `googtrans=${cookieValue}; path=/`;
      document.cookie = `googtrans=${cookieValue}; domain=${window.location.hostname}; path=/`;
    }

    localStorage.setItem('ngt_lang', short);
    localStorage.setItem('tenant_lang', short);
    setCurrentLanguage(short);
    window.location.reload();
  }, [currentLanguage]);

  // Clean up any rogue banner frames on the fly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const killBanner = () => {
      document.querySelector('.goog-te-banner-frame')?.remove();
      if (document.body.style.top) document.body.style.top = '0px';
      document.querySelectorAll('skiptranslate').forEach((el) => el.remove());
    };
    killBanner();
    const observer = new MutationObserver(killBanner);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const value = {
    isReady: true,
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };

  return (
    <GoogleTranslateContext.Provider value={value}>
      {/* Background initializer from next-google-translate-widget */}
      <div style={{ display: 'none' }} aria-hidden="true" className="notranslate" translate="no">
        <GoogleTranslate pageLanguage={pageLanguage} />
      </div>
      {children}
    </GoogleTranslateContext.Provider>
  );
}

export function useGoogleTranslate() {
  const context = useContext(GoogleTranslateContext);
  return context || {
    isReady: true,
    currentLanguage: 'en',
    changeLanguage: () => {},
    availableLanguages: defaultLanguages,
  };
}

export const useTranslation = useGoogleTranslate;

export default GoogleTranslateProvider;

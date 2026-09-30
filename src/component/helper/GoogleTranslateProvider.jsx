'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Script from 'next/script';

const defaultLanguages = [
  { value: 'en|en', label: 'English' },
  { value: 'en|bn', label: 'বাংলা (Bangla)' },
  { value: 'en|es', label: 'Español (Spanish)' },
  { value: 'en|hi', label: 'हिन्दी (Hindi)' },
  { value: 'en|de', label: 'Deutsch (German)' },
  { value: 'en|fr', label: 'Français (French)' },
  { value: 'en|ar', label: 'العربية (Arabic)' },
];

const GoogleTranslateContext = createContext(null);

export function GoogleTranslateProvider({
  children,
  pageLanguage = 'en',
  availableLanguages = defaultLanguages,
}) {
  const [isReady, setIsReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(pageLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.googleTranslateElementInit2 = function () {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: pageLanguage,
            autoDisplay: false,
          },
          'google_translate_element'
        );
      }
    };

    const fireEvent = (element, eventType) => {
      try {
        if (document.createEvent) {
          const event = document.createEvent('HTMLEvents');
          event.initEvent(eventType, true, true);
          element.dispatchEvent(event);
        } else if (element.fireEvent) {
          const event = document.createEventObject();
          element.fireEvent('on' + eventType, event);
        }
      } catch (e) {
        console.error('Error firing event:', e);
      }
    };

    window.doGTranslate = function (languageCode) {
      if (!languageCode) return;
      const langCode = languageCode.split('|')[1];
      const select = document.querySelector('select.goog-te-combo');
      if (!select || !document.getElementById('google_translate_element')) {
        setTimeout(() => {
          const retrySelect = document.querySelector('select.goog-te-combo');
          if (retrySelect) {
            retrySelect.value = langCode;
            fireEvent(retrySelect, 'change');
          }
        }, 150);
        return;
      }
      select.value = langCode;
      fireEvent(select, 'change');
    };

    const checkReady = () => {
      if (document.querySelector('.goog-te-combo')) {
        setIsReady(true);
        return true;
      }
      return false;
    };

    if (!checkReady()) {
      const interval = setInterval(() => {
        if (checkReady()) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [pageLanguage]);

  const changeLanguage = (langCode) => {
    const lang = langCode.includes('|') ? langCode.split('|')[1] : langCode;
    setCurrentLanguage(lang);
    if (typeof window !== 'undefined' && window.doGTranslate) {
      window.doGTranslate(langCode);
    }
  };

  const contextValue = {
    isReady,
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };

  return (
    <GoogleTranslateContext.Provider value={contextValue}>
      <div
        id="google_translate_element"
        className="google-translate-container"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          height: 0,
          overflow: 'hidden',
          visibility: 'hidden',
        }}
      />
      <Script
        id="google-translate-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            function googleTranslateElementInit2() {
              if (window.google && window.google.translate && window.google.translate.TranslateElement) {
                new window.google.translate.TranslateElement({
                  pageLanguage: '${pageLanguage}',
                  autoDisplay: false
                }, 'google_translate_element');
              }
            }
          `,
        }}
      />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit2"
        strategy="afterInteractive"
      />
      <Script
        id="google-translate-fire-event"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            function GTranslateFireEvent(a, b) {
              try {
                if (document.createEvent) {
                  var c = document.createEvent("HTMLEvents");
                  c.initEvent(b, true, true);
                  a.dispatchEvent(c);
                } else if (a.fireEvent) {
                  var c = document.createEventObject();
                  a.fireEvent('on' + b, c);
                }
              } catch (e) {}
            }
            function doGTranslate(a) {
              if (!a) return;
              var value = a.value || a;
              if (value === '') return;
              var b = value.split('|')[1];
              var c = document.querySelector('select.goog-te-combo');
              if (!c || !document.getElementById('google_translate_element')) {
                setTimeout(function() {
                  var retryC = document.querySelector('select.goog-te-combo');
                  if (retryC) {
                    retryC.value = b;
                    GTranslateFireEvent(retryC, 'change');
                  }
                }, 150);
                return;
              }
              c.value = b;
              GTranslateFireEvent(c, 'change');
            }
          `,
        }}
      />
      {children}
    </GoogleTranslateContext.Provider>
  );
}

export function useGoogleTranslate() {
  const context = useContext(GoogleTranslateContext);
  return context;
}

export default GoogleTranslateProvider;

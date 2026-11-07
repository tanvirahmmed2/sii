'use client';

import { useRouter, usePathname } from "next/navigation";
import React, { createContext, useState, useEffect, useCallback } from "react";

export const Context = createContext();

const PLATFORM_RESERVED = new Set([
  '',
  'creator',
  'developer',
  'developer-auth',
  'developers',
  'api',
  '_next',
  'marketing',
  'auth',
  'admin',
  'about',
  'blogs',
  'careers',
  'contact',
  'faqs',
  'packages',
  'policies',
  'reviews',
  'tutorials',
  'updates',
  'help',
  'terms',
  'privacy',
  'login',
  'register',
]);

const TENANT_DIRECT_PREFIXES = [
  '/staff-panel',
  '/student',
  '/teacher',
  '/officer',
  '/student-verify',
  '/officer-panel',
  '/websites',
  '/website',
  '/webite',
];

export function isTenantScope(pathname = '') {
  if (typeof window !== 'undefined') {
    const rawHostWithPort = window.location.host.toLowerCase();
    const rawHost = rawHostWithPort.split(':')[0];
    const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000').toLowerCase().trim();
    const baseHost = baseDomain.split(':')[0];

    if (rawHostWithPort.endsWith(`.${baseDomain}`)) {
      let sub = rawHostWithPort.slice(0, -(baseDomain.length + 1)).trim();
      if (sub.startsWith('www.')) sub = sub.slice(4).trim();
      if (sub && sub !== 'www') return true;
    }
    if (rawHost.endsWith(`.${baseHost}`)) {
      let sub = rawHost.slice(0, -(baseHost.length + 1)).trim();
      if (sub.startsWith('www.')) sub = sub.slice(4).trim();
      if (sub && sub !== 'www') return true;
    }
    if (rawHost.endsWith('.localhost')) {
      let sub = rawHost.replace('.localhost', '').trim();
      if (sub.startsWith('www.')) sub = sub.slice(4).trim();
      if (sub && sub !== 'www') return true;
    }

    if (
      rawHost &&
      rawHost !== baseHost &&
      rawHost !== `www.${baseHost}` &&
      rawHost !== 'localhost' &&
      rawHost !== '127.0.0.1'
    ) {
      return true;
    }
  }

  const path = (pathname || '').toLowerCase();

  for (const prefix of TENANT_DIRECT_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = segments[0];
    if (!PLATFORM_RESERVED.has(firstSegment)) {
      return true;
    }
  }

  return false;
}

export const ContextProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebar, setSidebar] = useState(false);

  const [theme, setThemeState] = useState('light');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (
        storedTheme === 'dark' ||
        (!storedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        setThemeState('dark');
        document.documentElement.classList.add('dark');
      } else {
        setThemeState('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (_) {}
      return next;
    });
  }, []);

  const goBack = () => {
    router.back();
  };

  const fetchCurrentUser = useCallback(async () => {
    if (isTenantScope(pathname)) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const devRes = await fetch('/api/marketing/developer/me').catch(() => null);
      if (devRes && devRes.ok) {
        const devData = await devRes.json();
        if (devData.success && devData.user) {
          setUser(devData.user);
          setLoading(false);
          return;
        }
      }

      const creatorRes = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'me' }),
      }).catch(() => null);
      if (creatorRes && creatorRes.ok) {
        const creatorData = await creatorRes.json();
        if (creatorData.success && creatorData.creator) {
          setUser(creatorData.creator);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <Context.Provider
      value={{
        goBack,
        sidebar,
        setSidebar,
        user,
        setUser,
        creator: user,
        loading,
        setLoading,
        reviews,
        setReviews,
        fetchCurrentUser,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </Context.Provider>
  );
};
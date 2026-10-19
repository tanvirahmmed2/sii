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
    const rawHost = window.location.host.toLowerCase().split(':')[0];

    // Subdomain of localhost (e.g. afit.localhost)
    if (rawHost.endsWith('.localhost')) {
      const sub = rawHost.replace('.localhost', '').trim();
      if (sub && sub !== 'www') return true;
    }

    // Subdomain or custom domain when host is not raw localhost / 127.0.0.1
    if (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1') {
      const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || '').toLowerCase().trim();
      if (baseDomain) {
        if (rawHost !== baseDomain && rawHost !== `www.${baseDomain}`) {
          return true;
        }
      } else {
        const parts = rawHost.split('.');
        if (parts.length > 2) return true;
      }
    }
  }

  // Path-based tenant check on localhost / base domain
  const path = (pathname || '').toLowerCase();

  for (const prefix of TENANT_DIRECT_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  // Preview path: /[domain]/...
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

  // Main SaaS marketing website sidebar (mobile nav toggle)
  const [sidebar, setSidebar] = useState(false);

  // Theme management (light / dark)
  const [theme, setThemeState] = useState('light');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  // Initialize theme from localStorage or system preference
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
    // If the visitor is on a tenant website or tenant panel, do not make marketing auth calls
    if (isTenantScope(pathname)) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Check developer/staff session
      const devRes = await fetch('/api/marketing/developer/me').catch(() => null);
      if (devRes && devRes.ok) {
        const devData = await devRes.json();
        if (devData.success && devData.user) {
          setUser(devData.user);
          setLoading(false);
          return;
        }
      }

      // Check creator session
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
      // In guest mode, ignore session fetch error
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
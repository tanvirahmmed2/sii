'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

export const TenantWebsiteContext = createContext(null);

export function useTenantWebsite() {
  const context = useContext(TenantWebsiteContext);
  if (!context) {
    throw new Error('useTenantWebsite must be used within a TenantWebsiteProvider');
  }
  return context;
}

import { hexToRgb, mixColor, calculateColorShades } from 'src/lib/utils/colors';

export { calculateColorShades };

export function TenantWebsiteProvider({ children, initialWebsite = null, slug: propSlug }) {
  const params = useParams();
  const router = useRouter();

  // Resolve slug/domain from props, route params, or browser host (custom domain / subdomain)
  const [activeSlug, setActiveSlug] = useState(() => {
    if (propSlug) return propSlug;
    if (params?.domain) return params.domain;
    if (params?.slug) return params.slug;
    if (typeof window !== 'undefined') {
      const host = window.location.host.toLowerCase().split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^https?:\/\//, '').split(':')[0].toLowerCase();
        if (base && host.endsWith(`.${base}`)) {
          return host.replace(`.${base}`, '');
        }
        return host;
      }
    }
    return '';
  });

  useEffect(() => {
    const candidate = propSlug || params?.domain || params?.slug;
    if (candidate) {
      setActiveSlug(candidate);
    } else if (typeof window !== 'undefined') {
      const host = window.location.host.toLowerCase().split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^https?:\/\//, '').split(':')[0].toLowerCase();
        if (base && host.endsWith(`.${base}`)) {
          setActiveSlug(host.replace(`.${base}`, ''));
        } else {
          setActiveSlug(host);
        }
      }
    }
  }, [propSlug, params?.domain, params?.slug]);

  // Tenant website metadata
  const [website, setWebsite] = useState(initialWebsite);
  const [loading, setLoading] = useState(!initialWebsite && !!activeSlug);
  const [error, setError] = useState(null);

  // Theme / Mode Management (Light vs Dark)
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('tenant_theme') || localStorage.getItem('theme');
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
      localStorage.setItem('tenant_theme', newTheme);
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
        localStorage.setItem('tenant_theme', next);
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


  // Color Theme Application directly from websites table (primary_color, secondary_color)
  const colorTheme = useMemo(() => {
    const primaryShades = calculateColorShades(website?.primary_color, '#1e40af');
    const secondaryShades = calculateColorShades(website?.secondary_color, '#0ea5e9');
    return {
      primary: primaryShades.base,
      primaryLight: primaryShades.light,
      primaryDark: primaryShades.dark,
      secondary: secondaryShades.base,
      secondaryLight: secondaryShades.light,
      secondaryDark: secondaryShades.dark,
      themeName: website?.theme || 'default',
    };
  }, [website?.primary_color, website?.secondary_color, website?.theme]);

  // Injects dynamic CSS color variables into :root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--primary', colorTheme.primary);
    root.style.setProperty('--primary-light', colorTheme.primaryLight);
    root.style.setProperty('--primary-dark', colorTheme.primaryDark);
    root.style.setProperty('--secondary', colorTheme.secondary);
    root.style.setProperty('--secondary-light', colorTheme.secondaryLight);
    root.style.setProperty('--secondary-dark', colorTheme.secondaryDark);

    return () => {
      // Keep or restore defaults when unmounting
    };
  }, [colorTheme]);

  // Tenant sidebar toggles (admin, teacher, student, staff, public)
  const [sidebar, setSidebar] = useState(false);
  const [adminSidebar, setAdminSidebar] = useState(false);
  const [teacherSidebar, setTeacherSidebar] = useState(false);
  const [studentSidebar, setStudentSidebar] = useState(false);
  const [staffSidebar, setStaffSidebar] = useState(false);

  // Tenant shared data
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState(
    initialWebsite?.settings || initialWebsite?.website_settings || null
  );

  const goBack = () => {
    router.back();
  };

  const getApiEndpoint = useCallback(
    (endpoint) => {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      if (activeSlug) {
        return `/api/${encodeURIComponent(activeSlug)}/${cleanEndpoint}`;
      }
      return `/api/${cleanEndpoint}`;
    },
    [activeSlug]
  );

  const fetchWebsiteData = useCallback(async () => {
    if (!activeSlug) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/${encodeURIComponent(activeSlug)}`);
      const data = await res.json();
      if (data.success && data.website) {
        setWebsite(data.website);
        if (data.website.settings || data.website.website_settings) {
          setWebsiteSettings(data.website.settings || data.website.website_settings);
        }
      } else {
        setWebsite(null);
        setError(data.error || 'Website not found');
      }
    } catch (err) {
      console.warn('Failed to fetch tenant website metadata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSlug]);

  const fetchWebsiteSettings = useCallback(async () => {
    try {
      const res = await fetch(getApiEndpoint('website-settings'));
      if (res.ok) {
        const data = await res.json();
        const settings = data.payload?.settings || data.paylod?.settings || data.settings;
        if (settings) {
          setWebsiteSettings(settings);
        }
      }
    } catch (err) {
      console.error('Error fetching website settings in WebsiteContext:', err);
    }
  }, [getApiEndpoint]);

  const fetchDesignations = useCallback(async () => {
    try {
      const designationsRes = await fetch(getApiEndpoint('authorities/designations'));
      if (designationsRes.ok) {
        const data = await designationsRes.json();
        setDesignations(data.payload?.designations || data.paylod?.designations || []);
      }
    } catch (err) {
      console.error('Error fetching designations in WebsiteContext:', err);
    }
  }, [getApiEndpoint]);

  const fetchClasses = useCallback(async () => {
    try {
      const classesRes = await fetch(getApiEndpoint('classes'));
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.payload?.classes || data.paylod?.classes || []);
      }
    } catch (err) {
      console.error('Error fetching classes in WebsiteContext:', err);
    }
  }, [getApiEndpoint]);

  const fetchClubs = useCallback(async () => {
    try {
      const clubsRes = await fetch(getApiEndpoint('clubs'));
      if (clubsRes.ok) {
        const data = await clubsRes.json();
        setClubs(data.payload?.clubs || data.paylod?.clubs || []);
      }
    } catch (err) {
      console.error('Error fetching clubs in WebsiteContext:', err);
    }
  }, [getApiEndpoint]);

  useEffect(() => {
    if (!initialWebsite && activeSlug) {
      fetchWebsiteData();
    }
  }, [initialWebsite, activeSlug, fetchWebsiteData]);

  useEffect(() => {
    fetchWebsiteSettings();
    fetchDesignations();
    fetchClasses();
    fetchClubs();
  }, [fetchWebsiteSettings, fetchDesignations, fetchClasses, fetchClubs]);

  // Dynamic path helper to keep internal links scoped to this tenant
  const tenantUrl = useCallback(
    (path = '') => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;

      // Staff panel routes always use clean root URLs (/staff-panel/...)
      if (cleanPath === '/staff-panel' || cleanPath.startsWith('/staff-panel/')) {
        return cleanPath;
      }

      if (typeof window !== 'undefined') {
        const host = window.location.host.toLowerCase().split(':')[0];

        // If accessed through subdomain (e.g. afit.localhost, afit.mysite.com)
        const isSubdomain =
          host.endsWith('.localhost') ||
          (activeSlug && (host === `${activeSlug}.localhost` || host.startsWith(`${activeSlug}.`)));

        if (isSubdomain) {
          return cleanPath;
        }

        // Only in explicit path preview mode on plain base domain when current URL explicitly starts with /${activeSlug}
        const isExplicitPathMode =
          (host === 'localhost' || host === '127.0.0.1') &&
          window.location.pathname.startsWith(`/${activeSlug}/`);

        if (isExplicitPathMode && activeSlug) {
          if (cleanPath === '/') return `/${activeSlug}`;
          return `/${activeSlug}${cleanPath}`;
        }
      }
      return cleanPath;
    },
    [activeSlug]
  );

  const value = {
    // Tenant website metadata
    website,
    setWebsite,
    slug: activeSlug,
    loading,
    error,
    tenantUrl,
    refetch: fetchWebsiteData,

    // Color theme tokens from websites table
    colorTheme,
    primaryColor: colorTheme.primary,
    secondaryColor: colorTheme.secondary,
    themeVariant: colorTheme.themeName,

    // Mode management (Light / Dark)
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,


    // Navigation
    goBack,

    // Tenant sidebar toggles
    sidebar,
    setSidebar,
    adminSidebar,
    setAdminSidebar,
    teacherSidebar,
    TeacherSidebar: teacherSidebar, // Backwards compatibility
    setTeacherSidebar,
    studentSidebar,
    setStudentSidebar,
    staffSidebar,
    setStaffSidebar,

    // Tenant shared data
    classes,
    setClasses,
    clubs,
    setClubs,
    designations,
    setDesignations,
    websiteSettings,
    setWebsiteSettings,
    fetchWebsiteSettings,
    getApiEndpoint,
  };

  return <TenantWebsiteContext.Provider value={value}>{children}</TenantWebsiteContext.Provider>;
}

export default TenantWebsiteContext;

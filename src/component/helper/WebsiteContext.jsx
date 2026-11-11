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

if (typeof window !== 'undefined' && window.performance && typeof window.performance.measure === 'function') {
  const _origMeasure = window.performance.measure.bind(window.performance);
  window.performance.measure = function(...args) {
    try {
      return _origMeasure(...args);
    } catch {
      return null;
    }
  };
}

import { hexToRgb, mixColor, calculateColorShades } from 'src/lib/utils/colors';

export { calculateColorShades };

function extractBrowserTenant() {
  if (typeof window === 'undefined') return '';
  const hostWithPort = window.location.host.toLowerCase();
  const host = hostWithPort.split(':')[0];
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000').toLowerCase().trim();
  const baseHost = baseDomain.split(':')[0];

  if (hostWithPort.endsWith(`.${baseDomain}`)) {
    let sub = hostWithPort.slice(0, -(baseDomain.length + 1)).trim();
    if (sub.startsWith('www.')) sub = sub.slice(4).trim();
    if (sub && sub !== 'www') return sub;
  }
  if (host.endsWith(`.${baseHost}`)) {
    let sub = host.slice(0, -(baseHost.length + 1)).trim();
    if (sub.startsWith('www.')) sub = sub.slice(4).trim();
    if (sub && sub !== 'www') return sub;
  }
  if (host.endsWith('.localhost')) {
    let sub = host.replace('.localhost', '').trim();
    if (sub.startsWith('www.')) sub = sub.slice(4).trim();
    if (sub && sub !== 'www') return sub;
  }
  if (host && host !== baseHost && host !== `www.${baseHost}` && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  return '';
}

export function TenantWebsiteProvider({ children, initialWebsite = null, slug: propSlug }) {
  const params = useParams();
  const router = useRouter();

  const [activeSlug, setActiveSlug] = useState(() => {
    if (propSlug) return propSlug;
    if (params?.domain) return params.domain;
    if (params?.slug) return params.slug;
    return extractBrowserTenant();
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const candidate = propSlug || params?.domain || params?.slug || extractBrowserTenant();
      if (candidate) {
        setActiveSlug(candidate);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [propSlug, params?.domain, params?.slug]);

  const [website, setWebsite] = useState(initialWebsite);
  const [loading, setLoading] = useState(!initialWebsite && !!activeSlug);
  const [error, setError] = useState(null);

  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(timer);
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

  const colorTheme = useMemo(() => {
    const primaryShades = calculateColorShades(website?.primary_color, '#A2AB73');
    const secondaryShades = calculateColorShades(website?.secondary_color, '#CC3A63');
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
    };
  }, [colorTheme]);

  const [sidebar, setSidebar] = useState(false);
  const [adminSidebar, setAdminSidebar] = useState(false);
  const [teacherSidebar, setTeacherSidebar] = useState(false);
  const [studentSidebar, setStudentSidebar] = useState(false);
  const [staffSidebar, setStaffSidebar] = useState(false);

  const [departments, setDepartments] = useState([]);
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
      const designationsRes = await fetch(getApiEndpoint('designations'));
      if (designationsRes.ok) {
        const data = await designationsRes.json();
        setDesignations(data.payload?.designations || data.paylod?.designations || []);
      }
    } catch (err) {
      console.error('Error fetching designations in WebsiteContext:', err);
    }
  }, [getApiEndpoint]);

  const fetchDepartments = useCallback(async () => {
    try {
      const deptRes = await fetch(getApiEndpoint('departments'));
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data.payload?.departments || data.paylod?.departments || data.departments || []);
      }
    } catch (err) {
      console.error('Error fetching departments in WebsiteContext:', err);
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
      const timer = setTimeout(() => {
        fetchWebsiteData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialWebsite, activeSlug, fetchWebsiteData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWebsiteSettings();
      fetchDesignations();
      fetchDepartments();
      fetchClasses();
      fetchClubs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWebsiteSettings, fetchDesignations, fetchDepartments, fetchClasses, fetchClubs]);

  const tenantUrl = useCallback(
    (path = '') => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;

      if (cleanPath === '/staff-panel' || cleanPath.startsWith('/staff-panel/')) {
        return cleanPath;
      }

      if (typeof window !== 'undefined') {
        const host = window.location.host.toLowerCase().split(':')[0];

        const isSubdomain =
          host.endsWith('.localhost') ||
          (activeSlug && (host === `${activeSlug}.localhost` || host.startsWith(`${activeSlug}.`)));

        if (isSubdomain) {
          return cleanPath;
        }

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

  const value = useMemo(
    () => ({
      website,
      setWebsite,
      slug: activeSlug,
      loading,
      error,
      tenantUrl,
      refetch: fetchWebsiteData,

      colorTheme,
      primaryColor: colorTheme.primary,
      secondaryColor: colorTheme.secondary,
      themeVariant: colorTheme.themeName,

      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,

      goBack,

      sidebar,
      setSidebar,
      adminSidebar,
      setAdminSidebar,
      teacherSidebar,
      TeacherSidebar: teacherSidebar, 
      setTeacherSidebar,
      studentSidebar,
      setStudentSidebar,
      staffSidebar,
      setStaffSidebar,

      departments,
      setDepartments,
      fetchDepartments,
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

      package: website?.package || null,
      allowedModules: website?.allowed_modules || [],
      allowedModuleSlugs: website?.allowed_module_slugs || [],
      allowedHomeModules: website?.allowed_home_modules || [],
      allowedHomeModulePaths: website?.allowed_home_module_paths || [],
      allowedControlModules: website?.allowed_control_modules || [],
      allowedControlModulePaths: website?.allowed_control_module_paths || [],
      isAvailableStudentPanel: website?.is_available_student_panel ?? true,
      isAvailableTeacherPanel: website?.is_available_teacher_panel ?? true,
      isAvailableCustomDomain: website?.is_available_custom_domain ?? false,
      hasModuleAllowance: (slug) => {
        if (!slug) return false;
        const target = String(slug).toLowerCase().trim();
        const slugs = website?.allowed_module_slugs || [];
        return slugs.includes(target);
      },
    }),
    [
      website,
      activeSlug,
      loading,
      error,
      tenantUrl,
      fetchWebsiteData,
      colorTheme,
      theme,
      setTheme,
      toggleTheme,
      sidebar,
      adminSidebar,
      teacherSidebar,
      studentSidebar,
      staffSidebar,
      departments,
      fetchDepartments,
      classes,
      clubs,
      designations,
      websiteSettings,
      fetchWebsiteSettings,
      getApiEndpoint,
      goBack,
    ]
  );

  return <TenantWebsiteContext.Provider value={value}>{children}</TenantWebsiteContext.Provider>;
}

export default TenantWebsiteContext;

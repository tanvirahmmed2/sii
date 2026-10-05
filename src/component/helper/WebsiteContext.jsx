'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

export const TenantWebsiteContext = createContext(null);

export function useTenantWebsite() {
  const context = useContext(TenantWebsiteContext);
  if (!context) {
    throw new Error('useTenantWebsite must be used within a TenantWebsiteProvider');
  }
  return context;
}

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

  // Tenant sidebar toggles (admin, teacher, student, staff, public)
  const [sidebar, setSidebar] = useState(false);
  const [adminSidebar, setAdminSidebar] = useState(false);
  const [TeacherSidebar, setTeacherSidebar] = useState(false);
  const [studentSidebar, setStudentSidebar] = useState(false);
  const [staffSidebar, setStaffSidebar] = useState(false);

  // Tenant shared data (classes, clubs, designations, websiteSettings)
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState(initialWebsite?.settings || initialWebsite?.website_settings || null);

  const goBack = () => {
    router.back();
  };

  const getApiEndpoint = useCallback((endpoint) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    if (activeSlug) {
      return `/api/${encodeURIComponent(activeSlug)}/${cleanEndpoint}`;
    }
    return `/api/${cleanEndpoint}`;
  }, [activeSlug]);

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
  const tenantUrl = useCallback((path = '') => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (typeof window !== 'undefined') {
      const host = window.location.host.toLowerCase();
      if (host === 'localhost:3000' || host === '127.0.0.1:3000') {
        return `/${activeSlug}${cleanPath === '/' ? '' : cleanPath}`;
      }
    }
    return cleanPath;
  }, [activeSlug]);

  const value = {
    // Tenant website metadata
    website,
    setWebsite,
    slug: activeSlug,
    loading,
    error,
    tenantUrl,
    refetch: fetchWebsiteData,

    // Navigation
    goBack,

    // Tenant sidebar toggles
    sidebar,
    setSidebar,
    adminSidebar,
    setAdminSidebar,
    TeacherSidebar,
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

  return (
    <TenantWebsiteContext.Provider value={value}>
      {children}
    </TenantWebsiteContext.Provider>
  );
}

export default TenantWebsiteContext;

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
  const activeSlug = propSlug || params?.slug || '';

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
  const [websiteSettings, setWebsiteSettings] = useState(null);

  const goBack = () => {
    router.back();
  };

  const fetchWebsiteData = useCallback(async () => {
    if (!activeSlug) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/marketing/websites/${encodeURIComponent(activeSlug)}`);
      const data = await res.json();
      if (data.success && data.website) {
        setWebsite(data.website);
      } else {
        // Fallback / default template if not yet provisioned in database
        setWebsite((prev) => prev || {
          name: activeSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          subdomain: activeSlug,
          primary_color: '#1e3a8a',
          secondary_color: '#0284c7',
          font_family: 'Inter',
          is_published: true,
        });
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
      const res = await fetch('/api/website-settings');
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
  }, []);

  const fetchDesignations = useCallback(async () => {
    try {
      const designationsRes = await fetch('/api/authorities/designations');
      if (designationsRes.ok) {
        const data = await designationsRes.json();
        setDesignations(data.payload?.designations || data.paylod?.designations || []);
      }
    } catch (err) {
      console.error('Error fetching designations in WebsiteContext:', err);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.payload?.classes || data.paylod?.classes || []);
      }
    } catch (err) {
      console.error('Error fetching classes in WebsiteContext:', err);
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    try {
      const clubsRes = await fetch('/api/clubs');
      if (clubsRes.ok) {
        const data = await clubsRes.json();
        setClubs(data.payload?.clubs || data.paylod?.clubs || []);
      }
    } catch (err) {
      console.error('Error fetching clubs in WebsiteContext:', err);
    }
  }, []);

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
    return `/websites/${activeSlug}${cleanPath}`;
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
  };

  return (
    <TenantWebsiteContext.Provider value={value}>
      {children}
    </TenantWebsiteContext.Provider>
  );
}

export default TenantWebsiteContext;

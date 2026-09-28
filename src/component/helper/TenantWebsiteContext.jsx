'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

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
  const activeSlug = propSlug || params?.slug || '';
  
  const [website, setWebsite] = useState(initialWebsite);
  const [loading, setLoading] = useState(!initialWebsite && !!activeSlug);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (!initialWebsite && activeSlug) {
      fetchWebsiteData();
    }
  }, [initialWebsite, activeSlug, fetchWebsiteData]);

  // Dynamic path helper to keep internal links scoped to this tenant
  const tenantUrl = useCallback((path = '') => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/websites/${activeSlug}${cleanPath}`;
  }, [activeSlug]);

  const value = {
    website,
    setWebsite,
    slug: activeSlug,
    loading,
    error,
    tenantUrl,
    refetch: fetchWebsiteData,
  };

  return (
    <TenantWebsiteContext.Provider value={value}>
      {children}
    </TenantWebsiteContext.Provider>
  );
}

export default TenantWebsiteContext;

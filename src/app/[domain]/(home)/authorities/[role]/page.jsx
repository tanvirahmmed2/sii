'use client';

import React, { useEffect, useState, useContext, use } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import AuthorityCard from 'src/component/website/cards/AuthorityCard';

const RoleAuthoritiesPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const roleSlug = params?.role;

  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [roleData, setRoleData] = useState(null);
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roleSlug) return;

    const fetchRoleAuthorities = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(getApiEndpoint(`authorities/role/${encodeURIComponent(roleSlug)}`));
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || data.payload || {};
          setRoleData(payload.designation || null);
          setAuthorities(payload.authorities || []);
        } else {
          const fallbackRes = await fetch(`${getApiEndpoint('authorities')}?role=${encodeURIComponent(roleSlug)}`);
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            const fbPayload = fbData.paylod || fbData.payload || {};
            const auths = fbPayload.authorities || [];
            setAuthorities(auths);
            if (auths.length > 0) {
              setRoleData({
                title: auths[0].designation_title || roleSlug,
                slug: roleSlug,
                description: null
              });
            }
          } else {
            setError('Failed to load authorities for this role.');
          }
        }
      } catch (err) {
        console.error('Error fetching role authorities:', err);
        setError('An unexpected error occurred while fetching role details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoleAuthorities();
  }, [roleSlug, getApiEndpoint]);

  const displayTitle = roleData?.title || roleSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Authority Role';

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href={tenantUrl('/')} className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href={tenantUrl('/authorities')} className="hover:text-primary transition-colors">
            Authorities
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100 font-medium truncate">{displayTitle}</span>
        </div>

        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block mb-1">
            Department Roster
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {displayTitle}
          </h1>
        </div>

        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 animate-pulse space-y-3"
                >
                  <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-md mx-auto space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Unable to Load Role Data</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
              <Link
                href={tenantUrl('/authorities')}
                className="inline-block px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
              >
                Back to Authorities
              </Link>
            </div>
          ) : authorities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No Members Listed Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No active authority members are currently assigned to {displayTitle}.
              </p>
              <Link
                href={tenantUrl('/authorities')}
                className="inline-block px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
              >
                Browse All Authorities
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {authorities.map((member) => (
                <AuthorityCard key={member.id} authority={member} isRole={false} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RoleAuthoritiesPage;

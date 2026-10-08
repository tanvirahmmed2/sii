'use client';

import React, { useEffect, useState, Suspense, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AuthorityViewContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [authority, setAuthority] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('No authority ID specified.');
      return;
    }

    const fetchAuthorityDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(getApiEndpoint(`authorities/${id}`));
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || data.payload || {};
          setAuthority(payload.authority || null);
        } else {
          setError('Authority member not found.');
        }
      } catch (err) {
        console.error('Error fetching authority details:', err);
        setError('Failed to load authority details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorityDetails();
  }, [id, getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <Link
            href={tenantUrl('/authorities')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Authorities Directory
          </Link>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs animate-pulse space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
              <div className="space-y-2 w-full max-w-md">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-md mx-auto space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile Not Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <Link
              href={tenantUrl('/authorities')}
              className="inline-block px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
            >
              Return to Authorities
            </Link>
          </div>
        ) : authority ? (
          <div className="space-y-6">
            
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 relative">
                  {authority.image ? (
                    <Image
                      fill
                      src={authority.image}
                      alt={authority.name}
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-semibold text-xl">
                      {authority.name?.slice(0, 2).toUpperCase() || 'AU'}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
                    {authority.designation_title || 'Institutional Leader'}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                    {authority.name}
                  </h1>

                  {authority.email && (
                    <div className="pt-1">
                      <a
                        href={`mailto:${authority.email}`}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                      >
                        Email: {authority.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {authority.bio && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-2">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Biography & Executive Statement
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                  {authority.bio}
                </p>
              </div>
            )}

            {/* Qualifications */}
            {authority.qualifications && authority.qualifications.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-3">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Academic Credentials
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {authority.qualifications.map((q) => (
                    <div
                      key={q.id}
                      className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded p-3 space-y-0.5"
                    >
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 text-xs">{q.degree}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{q.institution}</p>
                      {q.passing_year && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          Year: {q.passing_year}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
};

export default function AuthorityViewPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[calc(100vh-120px)] flex items-center justify-center">
          <span className="text-xs font-medium text-slate-500">Loading authority profile...</span>
        </div>
      }
    >
      <AuthorityViewContent />
    </Suspense>
  );
}

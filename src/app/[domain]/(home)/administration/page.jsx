'use client';

import React, { useEffect, useState, useContext } from 'react';
import AuthorityCard from 'src/component/website/cards/AuthorityCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AdministrationPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthorities = async () => {
      try {
        const res = await fetch(getApiEndpoint('authorities'));
        if (res.ok) {
          const data = await res.json();
          const list = data.payload?.authorities || data.paylod?.authorities || [];
          setMembers(list);
        }
      } catch (err) {
        console.error('Failed to fetch authorities in AdministrationPage:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthorities();
  }, [getApiEndpoint]);

  const filteredMembers = members.filter((m) => {
    const slug = (m.designation || '').toLowerCase();
    const title = (m.designation_title || '').toLowerCase();
    return (
      slug.includes('chairman') ||
      slug.includes('principal') ||
      title.includes('chairman') ||
      title.includes('principal')
    );
  });

  const chairmanMembers = filteredMembers.filter((m) => {
    const slug = (m.designation || '').toLowerCase();
    const title = (m.designation_title || '').toLowerCase();
    return slug.includes('chairman') || title.includes('chairman');
  });

  const principalMembers = filteredMembers.filter((m) => {
    const slug = (m.designation || '').toLowerCase();
    const title = (m.designation_title || '').toLowerCase();
    return (
      (slug.includes('principal') || title.includes('principal')) &&
      !slug.includes('chairman') &&
      !title.includes('chairman')
    );
  });

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Institutional Leadership
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Executive Governance & Administration
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Governing board leaders and principal executive officers guiding academic policy and operations.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 animate-pulse space-y-3">
                <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="w-full text-center py-12 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Executive Leadership Listed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chairman and principal authority profiles will appear here once registered.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Chairman Section */}
            {chairmanMembers.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                    Governing Board Chairman
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {chairmanMembers.map((member) => (
                    <AuthorityCard key={member.id} authority={member} />
                  ))}
                </div>
              </div>
            )}

            {/* Principal Section */}
            {principalMembers.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                    Principal & Academic Executives
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {principalMembers.map((member) => (
                    <AuthorityCard key={member.id} authority={member} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdministrationPage;
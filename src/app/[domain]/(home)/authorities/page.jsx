'use client';

import React, { useEffect, useState, useContext } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import AuthorityCard from 'src/component/website/cards/AuthorityCard';

const AuthoritiesPage = () => {
  const { designations: contextDesignations, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [authorities, setAuthorities] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const authRes = await fetch(getApiEndpoint('authorities'));
        if (authRes.ok) {
          const authData = await authRes.json();
          const payload = authData.payload || authData.paylod || {};
          setAuthorities(payload.authorities || []);
        }

        if (contextDesignations && contextDesignations.length > 0) {
          setDesignations(contextDesignations);
        } else {
          const desRes = await fetch(getApiEndpoint('authorities/designations'));
          if (desRes.ok) {
            const desData = await desRes.json();
            const desPayload = desData.payload || desData.paylod || {};
            setDesignations(desPayload.designations || []);
          }
        }
      } catch (err) {
        console.error('Error fetching authority data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contextDesignations, getApiEndpoint]);

  const isHeadFlag = (val) => val === true || val === 'true' || val === 1 || val === '1';

  const sortedDesignations = [...designations].sort((a, b) => {
    if (isHeadFlag(a.is_head) && !isHeadFlag(b.is_head)) return -1;
    if (!isHeadFlag(a.is_head) && isHeadFlag(b.is_head)) return 1;
    return (a.id || 0) - (b.id || 0);
  });

  const designationGroups = sortedDesignations
    .map((des) => {
      const members = authorities.filter(
        (a) =>
          a.designation_id === des.id ||
          (a.designation || '').toLowerCase() === (des.slug || '').toLowerCase() ||
          (a.designation || '').toLowerCase() === (des.title || '').toLowerCase()
      );
      return { designation: des, members };
    })
    .filter((g) => g.members.length > 0);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Governance &amp; Leadership
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Campus Leadership &amp; Governing Board
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          The Board of Trustees, Senate Executives, and Administrative Principals steering our institution.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 animate-pulse space-y-3"
            >
              <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-40 bg-slate-100 dark:bg-slate-800 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : designationGroups.length > 0 ? (
        <div className="space-y-6">
          {designationGroups.map(({ designation, members }) => (
            <div
              key={designation.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {designation.title}
                  </h2>
                  {isHeadFlag(designation.is_head) && (
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 uppercase tracking-wider">
                      Executive Head
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {members.length} Member{members.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {members.map((member) => (
                  <AuthorityCard key={member.id} authority={member} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : authorities.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {authorities.map((member) => (
            <AuthorityCard key={member.id} authority={member} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            No governing authorities listed
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            There are currently no board members registered in the database.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuthoritiesPage;

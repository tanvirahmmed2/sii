'use client';

import React, { useEffect, useState, useContext } from 'react';
import StaffCard from 'src/component/website/cards/StaffCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function PublicStaffPage() {
  const { getApiEndpoint, website } = useContext(TenantWebsiteContext);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint('staff'));
        const data = await res.json();
        setStaffList(data?.paylod?.staff || data?.payload?.staff || []);
      } catch (err) {
        console.error('Failed to load staff list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Administration Office
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Staff Directory
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Registrar officers, accounts desks, IT coordinators, and campus operations staff of {website?.name || 'our institution'}.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs animate-pulse flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : staffList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {staffList.map((staff) => (
              <StaffCard key={staff.id} staff={staff} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto shadow-xs space-y-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Staff Listed</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Staff directory profiles are published following departmental orientation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

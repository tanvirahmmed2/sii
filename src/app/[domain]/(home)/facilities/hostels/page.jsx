'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { HostelsCard } from 'src/component/website/cards';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const HostelFacilities = () => {
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const res = await fetch(getApiEndpoint('hostels'));
        if (res.ok) {
          const data = await res.json();
          setHostels(data.payload?.hostels || data.paylod?.hostels || []);
        }
      } catch (err) {
        console.error('Error fetching hostels:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHostels();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link href={tenantUrl('/facilities')} className="text-xs text-primary font-medium hover:underline">
              ← Back to Facilities Hub
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Residential Housing & Hostels
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Secure residential dormitories for enrolled students of {website?.name || 'our institution'}.
          </p>
        </div>

        {loading ? (
          <div className="w-full py-12 flex justify-center bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading residential dormitories...</span>
          </div>
        ) : hostels.length === 0 ? (
          <div className="w-full py-12 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6 shadow-xs space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Hostels Registered</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">No active hostel housing blocks are listed in the registry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {hostels.map((hostel) => (
              <HostelsCard key={hostel.id} hostel={hostel} />
            ))}
          </div>
        )}

        {/* Policy Notice Box */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">Important Housing Allocation Policies</h3>
          <p className="leading-relaxed text-[11px]">
            Housing allocations strictly observe gender segregation rules. Male candidates are allocated exclusively to Male Residential Blocks, and female candidates to Female Residential Blocks. Cross-gender room allocations are rejected automatically by the registrar system.
          </p>
        </div>

      </div>
    </div>
  );
};

export default HostelFacilities;
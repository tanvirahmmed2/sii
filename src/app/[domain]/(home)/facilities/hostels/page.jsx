'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Link
              href={tenantUrl('/facilities')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xs hover:border-primary/40 transition-colors"
            >
              &larr; Back to Facilities Hub
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Residential Housing &amp; Hostels
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Secure residential dormitories for enrolled students of {website?.name || 'our institution'}.
          </p>
        </motion.div>

        {loading ? (
          <div className="w-full py-16 flex justify-center items-center bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="loader loader-md" />
          </div>
        ) : hostels.length === 0 ? (
          <div className="w-full py-16 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center p-8 shadow-xs space-y-2">
            <h3 className="font-serif text-base font-medium text-slate-800 dark:text-slate-200">No Hostels Registered</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">No active hostel housing blocks are listed in the registry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {hostels.map((hostel) => (
              <HostelsCard key={hostel.id} hostel={hostel} />
            ))}
          </div>
        )}

        {/* Policy Notice Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-secondary/5 dark:bg-secondary/10 border border-secondary/20 rounded-2xl p-5 text-xs text-secondary-dark dark:text-secondary-light space-y-1.5"
        >
          <h3 className="font-semibold text-secondary-dark dark:text-secondary-light">Important Housing Allocation Policies</h3>
          <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
            Housing allocations strictly observe gender segregation rules. Male candidates are allocated exclusively to Male Residential Blocks, and female candidates to Female Residential Blocks. Cross-gender room allocations are rejected automatically by the registrar system.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default HostelFacilities;
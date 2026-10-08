'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function CollaborationsPage() {
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollaborations = async () => {
      try {
        const endpoint = getApiEndpoint('collaborations');
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const list = data.payload?.collaborations || data.paylod?.collaborations || [];
          setPartners(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Error fetching collaborations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollaborations();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto text-center space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          Global Academic &amp; Industry Network
        </span>
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Institutional Collaborations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          {website?.name || 'Our institution'} partners with accredited universities, educational foundations, research consortia, and industry organizations to foster academic excellence.
        </p>
      </div>

      {/* Partners Grid */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-xs font-medium text-slate-400">Loading collaborations...</span>
          </div>
        ) : partners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between"
              >
                <div className="flex gap-4 items-start">
                  {partner.logo ? (
                    <div className="w-14 h-14 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={partner.logo}
                        alt={partner.institution_name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                      [Logo]
                    </div>
                  )}

                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Academic Partner
                    </span>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      {partner.institution_name}
                    </h2>
                    {partner.description && (
                      <div
                        className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1"
                        dangerouslySetInnerHTML={{ __html: partner.description }}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Authorized Partnership</span>
                  <span className="font-mono">Ref #{partner.id}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 shadow-xs max-w-md mx-auto space-y-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              [No Partners Registered]
            </span>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              No Collaborations on Record
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Active institutional partnerships will appear here once officially logged in the system.
            </p>
          </div>
        )}
      </div>

      {/* External Relations Inquiry Callout */}
      <div className="max-w-5xl mx-auto bg-slate-900 text-white rounded-md p-6 sm:p-8 border border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            External Relations &amp; Linkages
          </span>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Interested in Partnering with {website?.name || 'Our Institution'}?
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            We welcome academic faculty exchange programs, student internships, curriculum co-development, and joint research initiatives.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            href={tenantUrl('/contact?subject=Partnership+Inquiry')}
            className="inline-block px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold transition-colors text-center"
          >
            Contact External Relations →
          </Link>
        </div>
      </div>
    </div>
  );
}

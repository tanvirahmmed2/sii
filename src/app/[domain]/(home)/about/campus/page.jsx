'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const CampusPage = () => {
  const { website, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Institution';

  const facilities = [
    {
      title: 'Central Library & Reading Terminal',
      desc: 'Extensive academic archive housing reference volumes, national curriculum texts, and high-speed digital research terminals for students and faculty.'
    },
    {
      title: 'Engineering & Computing Laboratories',
      desc: 'Modern workbenches equipped for physics, chemistry, biology experiments, computer networking, and robotics design.'
    },
    {
      title: 'Hostels & Residential Halls',
      desc: 'Supervised student living quarters featuring dining rooms, round-the-clock water and electricity back-up, and monitored entry gates.'
    },
    {
      title: 'Athletics & Recreation Grounds',
      desc: 'Spacious outdoor playgrounds for football, cricket, and athletics, alongside indoor table tennis and badminton setups.'
    },
    {
      title: 'Healthcare & First-Aid Post',
      desc: 'On-site health post stocked with fundamental emergency supplies and staffed for primary illness evaluations.'
    },
    {
      title: 'Auditorium & Multi-Purpose Hall',
      desc: 'Acoustically treated event space facilitating national celebrations, prize-giving ceremonies, seminars, and debates.'
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Campus Infrastructure & Facilities
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            {schoolName} provides a purpose-built campus environment optimized for intellectual pursuit, technical training, and safe student living.
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilities.map((fac, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded shadow-xs space-y-1.5"
            >
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Facility {idx + 1}
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {fac.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {fac.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Map Location Section */}
        {website?.map_url && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Campus Geographic Location
            </h3>
            {website.map_url.includes('<iframe') ? (
              <div 
                className="w-full h-72 rounded border border-slate-200 dark:border-slate-800 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: website.map_url }}
              />
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Campus Navigation Coordinates: {website.address || 'Main Campus'}
                </span>
                <a
                  href={website.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
                >
                  Open in Maps
                </a>
              </div>
            )}
          </div>
        )}

        {/* Inquiries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Campus Visits & Security Regulations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Parents and visitors must log at the security desk upon arrival with valid national ID.
            </p>
          </div>
          <Link
            href={tenantUrl('/contact')}
            className="px-3.5 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors shrink-0"
          >
            Contact Administrative Desk
          </Link>
        </div>

      </div>
    </div>
  );
};

export default CampusPage;

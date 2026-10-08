'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const FacilitiesPage = () => {
  const { tenantUrl, website } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Institution';

  const cards = [
    {
      title: 'Residential Hostels & Housing',
      desc: 'On-campus dormitories, student living halls, gender-segregated allocations, and provost governance.',
      href: tenantUrl('/facilities/hostels')
    },
    {
      title: 'Modern Classrooms & Studios',
      desc: 'Multimedia interactive projectors, acoustic treatment, ergonomic seating, and digital writing pads.',
      href: tenantUrl('/facilities/classrooms')
    },
    {
      title: 'Laboratories & Research Grounds',
      desc: 'Applied physics, computing servers, chemistry testing stations, and campus athletics tracks.',
      href: tenantUrl('/about/campus')
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Campus Facilities
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Infrastructure & Services
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Modern facilities built to support study, research innovation, and safe campus accommodations.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                  Facility Sector
                </span>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {card.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  {card.desc}
                </p>
              </div>
              <Link
                href={card.href}
                className="text-xs font-medium text-primary hover:underline block pt-2"
              >
                Inspect Facility &rarr;
              </Link>
            </div>
          ))}
        </div>

        {/* Standard notice */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-1.5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Environmental & Safety Standards</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {schoolName} updates study blocks in alignment with building safety benchmarks. All laboratories feature fire suppression stations, emergency eye-wash faucets, and stable backup energy generators.
          </p>
        </div>

      </div>
    </div>
  );
};

export default FacilitiesPage;
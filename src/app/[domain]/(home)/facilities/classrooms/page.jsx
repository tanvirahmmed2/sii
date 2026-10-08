'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ClassroomFacilities = () => {
  const { tenantUrl } = useContext(TenantWebsiteContext);

  const features = [
    {
      title: 'Interactive Projector Systems & Audio',
      desc: 'Smart overhead displays and digital writing pads enable faculty to mirror software simulations and lecture slides seamlessly.'
    },
    {
      title: 'Reliable Electrical & Campus Fiber Backbone',
      desc: 'Dual generator failover backups keep computers and lab equipment operating continuously throughout scheduled classes.'
    },
    {
      title: 'Controlled Climate & Ventilation',
      desc: 'Air filtration ducts and modern climate control units maintain air quality, supporting high student focus during long lectures.'
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link href={tenantUrl('/facilities')} className="text-xs text-primary font-medium hover:underline">
              ← Back to Facilities Hub
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Classrooms & Lecture Halls
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Designed for acoustic clarity, digital interactivity, and ergonomic study comfort.
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-4">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-1.5"
            >
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                Standard {idx + 1}
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ClassroomFacilities;
'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-8">
        
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
            Classrooms &amp; Lecture Halls
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Designed for acoustic clarity, digital interactivity, and ergonomic study comfort.
          </p>
        </motion.div>

        {/* Feature List */}
        <div className="space-y-4">
          {features.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -2 }}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 space-y-2"
            >
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                Standard {idx + 1}
              </span>
              <h2 className="text-base sm:text-lg font-serif font-medium text-slate-900 dark:text-slate-100">
                {item.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ClassroomFacilities;
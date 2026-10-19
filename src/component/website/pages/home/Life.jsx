'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Life = () => {
  const { website, websiteSettings, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-6xl mx-auto space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto space-y-2"
        >
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
            Campus Experience
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Student Life at {schoolName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Education extends far beyond lectures. We cultivate dynamic environments for student co-curriculars, intellectual debate, athletics, and residential community life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors group"
          >
            <div className="space-y-2.5">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
                Extracurricular
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                Student Activity Clubs
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Join computing guilds, science forums, debate societies, art circles, and environmental committees to build leadership skills.
              </p>
            </div>
            <Link
              href={tenantUrl('/clubs')}
              className="text-xs font-semibold text-primary hover:underline pt-3 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
            >
              <span>Explore Active Clubs</span>
              <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors group"
          >
            <div className="space-y-2.5">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
                Residential
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                Residential Halls &amp; Hostels
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Secure, gender-segregated campus residences with quiet study spaces, reliable utility backup, meal services, and faculty provost oversight.
              </p>
            </div>
            <Link
              href={tenantUrl('/facilities')}
              className="text-xs font-semibold text-primary hover:underline pt-3 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
            >
              <span>View Living Accommodations</span>
              <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors group"
          >
            <div className="space-y-2.5">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
                Athletics
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                Athletics &amp; Wellness
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Competitive inter-school sports leagues, physical education programs, gymnasiums, and outdoor courts promoting healthy physical wellness.
              </p>
            </div>
            <Link
              href={tenantUrl('/events')}
              className="text-xs font-semibold text-primary hover:underline pt-3 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
            >
              <span>View Sports &amp; Activities</span>
              <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Life;
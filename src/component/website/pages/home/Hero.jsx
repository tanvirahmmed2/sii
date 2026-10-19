'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Hero = () => {
  const { website, websiteSettings, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
  });

  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const eiin = website?.eiin_number || websiteSettings?.eiin || null;
  const institutionType = website?.institution_type || 'Educational Institution';
  const motto =
    websiteSettings?.motto ||
    'Dedicated to academic excellence, leadership development, and character building.';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await fetch(getApiEndpoint('home/stats'));
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const payload = statsData.payload || statsData.paylod;
          if (statsData.success && payload) {
            setStats({
              totalStudents: payload.totalStudents || 0,
              totalTeachers: payload.totalTeachers || 0,
              totalClasses: payload.totalClasses || 0,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching public stats in Hero:', err);
      }
    };

    fetchStats();
  }, [getApiEndpoint]);

  return (
    <section className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 flex flex-col items-center text-center space-y-6 max-w-6xl mx-auto"
      >
        
        {/* Overline Category */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block"
        >
          {institutionType}
        </motion.span>

        {/* Institution Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 dark:text-white tracking-tight max-w-4xl leading-[1.1]"
        >
          {schoolName}
        </motion.h1>

        {/* Institution Motto / Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-normal"
        >
          {motto}
        </motion.p>

        {/* Primary Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/admission/apply')}
              className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-primary/20 transition-all duration-300 text-xs sm:text-sm cursor-pointer"
            >
              Apply for Admission
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/auth/student')}
              className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 hover:text-primary font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-xs text-xs sm:text-sm cursor-pointer"
            >
              Student Portal
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/notices')}
              className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 hover:text-primary font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-xs text-xs sm:text-sm cursor-pointer"
            >
              Notice Board
            </Link>
          </motion.div>
        </motion.div>

        {/* High-Density Statistical KPI Strip */}
        <div className="w-full max-w-4xl pt-10 sm:pt-12 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-1.5 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300"
          >
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              Enrolled Students
            </span>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
              {stats.totalStudents ? stats.totalStudents.toLocaleString() : '0'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Active Academic Cohort
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-1.5 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300"
          >
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              Faculty Members
            </span>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
              {stats.totalTeachers ? stats.totalTeachers.toLocaleString() : '0'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Dedicated Instructors
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-1.5 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300"
          >
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              Class Programs
            </span>
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
              {stats.totalClasses ? stats.totalClasses.toLocaleString() : '0'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Academic Curriculums
            </span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
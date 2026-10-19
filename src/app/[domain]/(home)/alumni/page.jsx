'use client';

import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Alumni = () => {
  const { website } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Institution';

  const testimonials = [
    {
      name: 'Sarah Rahman',
      batch: 'Class of 2018',
      role: 'Lead Software Architect at Technology Firm',
      quote: 'The academic rigor and laboratory assignments provided fundamental engineering perspective that shaped my professional practice.'
    },
    {
      name: 'Tanvir Ahmed',
      batch: 'Class of 2021',
      role: 'Systems & Cloud Infrastructure Engineer',
      quote: 'Hands-on computing workshops, server labs, and dedicated faculty guidance were directly aligned with current industry expectations.'
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Graduates Network
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            {schoolName} Alumni Association
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Connecting our graduates across academia, engineering enterprises, public administration, and global research institutions.
          </p>
        </motion.div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-colors space-y-2"
          >
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
              Network Access
            </span>
            <h3 className="font-serif font-medium text-base text-slate-900 dark:text-slate-100">
              Global Alumni Registry
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect with fellow graduates to exchange technical knowledge, seek professional mentorship, and explore career advancements.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-colors space-y-2"
          >
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
              Careers
            </span>
            <h3 className="font-serif font-medium text-base text-slate-900 dark:text-slate-100">
              Industry Placement &amp; Referrals
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Direct recruitment referrals and internship sponsorships supported by established alumni working across diverse sectors.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-colors space-y-2"
          >
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
              Engagement
            </span>
            <h3 className="font-serif font-medium text-base text-slate-900 dark:text-slate-100">
              Annual Convocations &amp; Lectures
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Participate in reunion dinners, guest lectures for current students, and advisory boards assessing academic syllabi.
            </p>
          </motion.div>
        </div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5"
        >
          <h2 className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100">
            Graduate Experiences
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t, idx) => (
              <motion.div 
                key={idx} 
                whileHover={{ y: -2 }}
                className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3 transition-colors"
              >
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-3">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">{t.name}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.batch} &bull; {t.role}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Alumni;
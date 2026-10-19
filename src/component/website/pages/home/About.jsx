'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const About = () => {
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
            Institutional Legacy
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Commitment to Character, Scholarship &amp; Community
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Founded on the pillars of holistic growth, scholarship, and integrity, {schoolName} is dedicated to preparing students for global career success through rigorous academics and progressive teaching methods.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 space-y-2.5 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors"
          >
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              01 &bull; Academic Infrastructure
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Smart Classrooms &amp; Laboratories
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Digital multimedia connectivity, comprehensive STEM experimental laboratories, and modern learning aids supporting student engagement.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 space-y-2.5 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors"
          >
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              02 &bull; Research &amp; Innovation
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Library &amp; Computing Resources
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              High-speed internet laboratories, curated research archives, and specialized literature supporting exploratory curiosity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 space-y-2.5 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors"
          >
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              03 &bull; Recognized Standards
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Board Accreditation &amp; Standing
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Fully approved curriculum recognized across regional examination boards, guaranteeing seamless credit transfer and credentials.
            </p>
          </motion.div>
        </div>

        <div className="text-center pt-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="inline-block">
            <Link
              href={tenantUrl('/about')}
              className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 hover:text-primary font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-xs text-xs sm:text-sm cursor-pointer"
            >
              Learn More About Our Campus &rarr;
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
'use client';

import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import TeacherCard from 'src/component/website/cards/TeacherCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const TeachersPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/teachers'));
        if (res.ok) {
          const data = await res.json();
          setTeachers(data.payload?.teachers || data.paylod?.teachers || data.teachers || []);
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors max-w-7xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full border-b border-slate-200/80 dark:border-slate-800 pb-6"
      >
        <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block mb-2">
          Academic Faculty
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
          Meet Our Expert Faculty Members
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
          Our teachers, subject coordinators, and academic guides mentoring student excellence.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 animate-pulse flex flex-col gap-3 shadow-xs"
            >
              <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4 mx-auto" />
              <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      ) : teachers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {teachers.map((teacher, idx) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
            >
              <TeacherCard teacher={teacher} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
            No active faculty members found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            There are currently no listed academic teachers in the institution records.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeachersPage;

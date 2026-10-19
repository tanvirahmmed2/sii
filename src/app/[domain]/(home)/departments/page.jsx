'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const DepartmentsPage = () => {
  const { tenantUrl, getApiEndpoint, departments: initialDepts } = useContext(TenantWebsiteContext);
  const [departments, setDepartments] = useState(initialDepts || []);
  const [loading, setLoading] = useState(!initialDepts || initialDepts.length === 0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let ignore = false;
    const fetchDepartments = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/departments'));
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setDepartments(data.payload?.departments || data.paylod?.departments || data.departments || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchDepartments();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return departments;
    const q = searchTerm.toLowerCase();
    return departments.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        d.motto?.toLowerCase().includes(q) ||
        d.summary?.toLowerCase().includes(q)
    );
  }, [departments, searchTerm]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors overflow-hidden">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full border-b border-slate-200/80 dark:border-slate-800 pb-6 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
            Academic Faculty &amp; Disciplines
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-white tracking-tight mt-1.5">
            Academic Departments
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Discover our specialized academic disciplines, syllabus structure, class programs, and pedagogical standards.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-style w-full text-xs"
          />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="w-full h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredDepartments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => {
              const deptSlug = dept.slug || (dept.name ? dept.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') : dept.id);
              const deptLink = tenantUrl(`/departments/${deptSlug}`);
              const classesList = Array.isArray(dept.classes) ? dept.classes : [];

              return (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.4) }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-serif font-medium text-slate-900 dark:text-white text-lg tracking-tight truncate">
                          {dept.name}
                        </h2>
                        {dept.code && (
                          <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            CODE: {dept.code}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20">
                        {dept.class_count || classesList.length} Classes
                      </span>
                    </div>

                    {dept.motto && (
                      <p className="text-xs italic text-primary dark:text-primary-light font-medium leading-relaxed">
                        &ldquo;{dept.motto}&rdquo;
                      </p>
                    )}

                    {dept.dept_head && (
                      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 relative">
                          {dept.dept_head.image ? (
                            <img
                              src={dept.dept_head.image}
                              alt={dept.dept_head.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {dept.dept_head.name?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          <span className="font-semibold text-slate-900 dark:text-white">Head:</span> {dept.dept_head.name}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {dept.summary ||
                        dept.detailed_description ||
                        `Explore the academic programs, curriculum standards, and faculty under ${dept.name}.`}
                    </p>

                    {/* Classes Tags under Department */}
                    {classesList.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                          Offered Classes:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {classesList.slice(0, 5).map((c) => (
                            <Link
                              key={c.id || c.code}
                              href={tenantUrl(`/classes/${c.code || c.id}`)}
                              className="text-[10px] px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              {c.name}
                            </Link>
                          ))}
                          {classesList.length > 5 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-slate-400">
                              +{classesList.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    {dept.expected_cost && parseFloat(dept.expected_cost) > 0 ? (
                      <span className="text-[11px] font-semibold text-primary dark:text-primary-light">
                        ৳{parseFloat(dept.expected_cost).toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">/ yr</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Standard Fee</span>
                    )}

                    <div className="flex items-center gap-2">
                      <Link
                        href={deptLink}
                        className="font-medium text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 group"
                      >
                        Department Profile <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center max-w-lg mx-auto">
            <h3 className="font-serif text-lg font-medium text-slate-900 dark:text-white">
              No departments found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
              {searchTerm
                ? `No academic department matched "${searchTerm}". Try another search term.`
                : 'There are currently no active academic departments configured.'}
            </p>
          </div>
        )}

        {/* Admission Prompt Box */}
        <div className="mt-12 bg-linear-to-br from-white via-slate-50 to-primary/5 dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-serif font-medium text-slate-900 dark:text-white">
              Interested in Enrolling in One of Our Departments?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Review current admission circulars, eligibility criteria, and submit your application online.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={tenantUrl('/admission')}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              Circulars &amp; Criteria
            </Link>
            <Link
              href={tenantUrl('/admission/apply')}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all shadow-xs hover:shadow-primary/20"
            >
              Apply Online Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentsPage;

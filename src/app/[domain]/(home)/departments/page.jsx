'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import Link from 'next/link';
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
        const res = await fetch(getApiEndpoint('departments'));
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors">
      {/* Page Header */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-5 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            Academic Faculty &amp; Disciplines
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Academic Departments
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
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
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="w-full h-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredDepartments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDepartments.map((dept) => {
              const deptLink = tenantUrl(`/departments/${dept.id}`);
              const classesList = Array.isArray(dept.classes) ? dept.classes : [];

              return (
                <div
                  key={dept.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight truncate">
                          {dept.name}
                        </h2>
                        {dept.code && (
                          <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            CODE: {dept.code}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                        {dept.class_count || classesList.length} Classes
                      </span>
                    </div>

                    {dept.motto && (
                      <p className="text-xs italic text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                        &ldquo;{dept.motto}&rdquo;
                      </p>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {dept.summary ||
                        dept.detailed_description ||
                        `Explore the academic programs, curriculum standards, and faculty under ${dept.name}.`}
                    </p>

                    {/* Classes Tags under Department */}
                    {classesList.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                          Offered Classes:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {classesList.slice(0, 5).map((c) => (
                            <Link
                              key={c.id || c.code}
                              href={tenantUrl(`/classes/${c.code || c.id}`)}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    {dept.expected_cost && parseFloat(dept.expected_cost) > 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ৳{parseFloat(dept.expected_cost).toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">/ yr</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Standard Fee</span>
                    )}

                    <div className="flex items-center gap-2">
                      <Link
                        href={deptLink}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Department Profile &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center max-w-lg mx-auto">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
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
        <div className="mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Interested in Enrolling in One of Our Departments?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Review current admission circulars, eligibility criteria, and submit your application online.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={tenantUrl('/admission')}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Circulars &amp; Criteria
            </Link>
            <Link
              href={tenantUrl('/admission/apply')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
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

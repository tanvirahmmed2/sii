'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const DepartmentDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { tenantUrl, getApiEndpoint, website } = useContext(TenantWebsiteContext);

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchDeptData = async () => {
      try {
        const res = await fetch(getApiEndpoint('departments'));
        if (res.ok) {
          const data = await res.json();
          const list = data.payload?.departments || data.paylod?.departments || data.departments || [];
          const found = list.find(
            (d) => String(d.id) === String(id) || String(d.code).toLowerCase() === String(id).toLowerCase()
          );
          if (!ignore) {
            setDepartment(found || null);
          }
        }
      } catch (err) {
        console.error('Error fetching department details:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchDeptData();
    return () => {
      ignore = true;
    };
  }, [id, getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(tenantUrl('/departments'))}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            &larr; Back to All Departments
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Academic Discipline Profile
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="w-full h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse" />
            <div className="w-full h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse" />
          </div>
        ) : department ? (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {department.code && (
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                      Discipline Code: {department.code}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {department.class_count || (department.classes?.length || 0)} Associated Classes
                  </span>
                </div>

                {department.expected_cost && parseFloat(department.expected_cost) > 0 && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <span>Estimated Commitment:</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">
                      ৳{parseFloat(department.expected_cost).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">/ academic session</span>
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {department.name}
                </h1>
                {department.motto && (
                  <p className="text-sm italic font-medium text-blue-700 dark:text-blue-400 mt-1">
                    &ldquo;{department.motto}&rdquo;
                  </p>
                )}
              </div>

              {department.summary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Department Summary
                  </span>
                  {department.summary}
                </div>
              )}

              {department.detailed_description && (
                <div
                  className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-3 border-t border-slate-100 dark:border-slate-800"
                  dangerouslySetInnerHTML={{ __html: department.detailed_description }}
                />
              )}
            </div>

            {/* Classes Offered Under This Department */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Academic Classes Under {department.name}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {department.classes?.length || 0} Listed
                </span>
              </div>

              {department.classes && department.classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {department.classes.map((cls) => (
                    <div
                      key={cls.id || cls.code}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {cls.name}
                          </h3>
                          {cls.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                              {cls.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={tenantUrl(`/classes/${cls.code || cls.id}`)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between"
                      >
                        <span>View Class Details</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  No academic classes are currently registered specifically under this department.
                </div>
              )}
            </div>

            {/* Admission CTA Box */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold">
                  Apply for Admission in {department.name}
                </h3>
                <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
                  Ready to enroll? Fill up your credentials and submit an application for this discipline.
                </p>
              </div>
              <Link
                href={tenantUrl('/admission/apply')}
                className="px-5 py-2.5 rounded-lg bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-colors shrink-0 shadow-sm"
              >
                Start Application Online &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Department Not Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The department identifier &ldquo;{id}&rdquo; was not found in {website?.name || 'our database'}.
            </p>
            <Link
              href={tenantUrl('/departments')}
              className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Browse All Departments
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDetailPage;

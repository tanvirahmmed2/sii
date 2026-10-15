'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiMail, FiPhone, FiCalendar, FiUser, FiAward, FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const DepartmentDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug || params?.id;
  const { tenantUrl, getApiEndpoint, website } = useContext(TenantWebsiteContext);

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchDeptData = async () => {
      try {
        setLoading(true);
        const res = await fetch(getApiEndpoint(`home/departments/${encodeURIComponent(slug)}`));
        if (res.ok) {
          const data = await res.json();
          const dept = data.payload?.department || data.paylod?.department || data.department || null;
          if (!ignore) {
            setDepartment(dept);
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

    if (slug) {
      fetchDeptData();
    }
    return () => {
      ignore = true;
    };
  }, [slug, getApiEndpoint]);

  const deptHead = department?.dept_head;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            href={tenantUrl('/departments')}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
          >
            <FiArrowLeft className="w-3.5 h-3.5" /> Back to All Departments
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded">
            Academic Department
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse" />
            <div className="w-full h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse" />
          </div>
        ) : department ? (
          <div className="space-y-6">

            {/* TOP SECTION: DEPARTMENT HEAD SHOWCASE */}
            {deptHead && (
              <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Photo / Avatar */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800">
                      {deptHead.image ? (
                        <Image
                          src={deptHead.image}
                          alt={deptHead.name}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300">
                          <FiUser className="w-12 h-12 stroke-1" />
                        </div>
                      )}
                    </div>
                    <span className="mt-2.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <FiAward className="w-3 h-3" /> Dept. Head
                    </span>
                  </div>

                  {/* Info and Message */}
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="text-xs text-blue-300 font-medium">
                          {deptHead.title || 'Department Leadership'}
                        </span>
                        {deptHead.designation && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                            {deptHead.designation}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {deptHead.name}
                      </h2>
                    </div>

                    {/* Department Head's Welcome Note / Message */}
                    {deptHead.message ? (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                        &ldquo;{deptHead.message}&rdquo;
                      </div>
                    ) : deptHead.bio ? (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                        {deptHead.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Overseeing curriculum innovation, student excellence, and faculty collaboration within the {department.name}.
                      </p>
                    )}

                    {/* Contact Badges */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs text-slate-300">
                      {deptHead.email && (
                        <a
                          href={`mailto:${deptHead.email}`}
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                          <FiMail className="w-3.5 h-3.5 text-blue-400" />
                          <span>{deptHead.email}</span>
                        </a>
                      )}
                      {deptHead.phone && (
                        <a
                          href={`tel:${deptHead.phone}`}
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                          <FiPhone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{deptHead.phone}</span>
                        </a>
                      )}
                      {deptHead.joining_date && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <FiCalendar className="w-3.5 h-3.5" />
                          <span>Appointed: {new Date(deptHead.joining_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Department Overview Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {department.code && (
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                      Code: {department.code}
                    </span>
                  )}
                  {department.slug && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      /{department.slug}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {department.classes?.length || department.class_count || 0} Academic Classes
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
                    Discipline Scope &amp; Focus
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
                <div className="flex items-center gap-2">
                  <FiBookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Academic Classes Under {department.name}
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {department.classes?.length || 0} Programs
                </span>
              </div>

              {department.classes && department.classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {department.classes.map((cls) => (
                    <Link
                      key={cls.id || cls.code}
                      href={tenantUrl(`/classes/${cls.code || cls.id}`)}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cls.name}
                          </h3>
                          {cls.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                              {cls.code}
                            </span>
                          )}
                        </div>
                        {cls.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {cls.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Max Capacity: {cls.max_seats || 40}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">View Class &rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No specific academic classes assigned under this department yet.
                </div>
              )}
            </div>

            {/* Department Faculty Members */}
            {department.teachers && department.teachers.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Department Faculty &amp; Instructors
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {department.teachers.length} Faculty Members
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {department.teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={tenantUrl(`/teachers/${teacher.username || teacher.id}`)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 relative">
                        {teacher.photo_url ? (
                          <Image
                            src={teacher.photo_url}
                            alt={teacher.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                            {teacher.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {teacher.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {teacher.designation_title || 'Faculty Member'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Department Not Found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              The academic discipline you are seeking could not be found or has been restructured.
            </p>
            <Link
              href={tenantUrl('/departments')}
              className="inline-block mt-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
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

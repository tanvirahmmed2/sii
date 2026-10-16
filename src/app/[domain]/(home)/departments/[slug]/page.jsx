'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiMail,
  FiPhone,
  FiCalendar,
  FiUser,
  FiAward,
  FiArrowLeft,
  FiMessageSquare,
  FiCheckCircle,
  FiBookOpen,
  FiLayers,
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const DepartmentDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const rawIdentifier = params?.slug || params?.id;
  const { tenantUrl, getApiEndpoint, website } = useContext(TenantWebsiteContext);

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchDeptData = async () => {
      if (!rawIdentifier) return;
      try {
        setLoading(true);
        const res = await fetch(getApiEndpoint(`home/departments/${encodeURIComponent(rawIdentifier)}`));
        if (res.ok) {
          const data = await res.json();
          const dept = data.payload?.department || data.paylod?.department || data.department || null;
          if (!ignore && dept) {
            setDepartment(dept);
            setImageError(false);

            // Canonical slug redirect: if user accessed via [id] (e.g. /departments/3),
            // replace URL with the canonical [slug] (e.g. /departments/electrical-electronics-engineering)
            if (dept.slug && String(rawIdentifier).toLowerCase() !== String(dept.slug).toLowerCase()) {
              router.replace(tenantUrl(`/departments/${dept.slug}`));
            }
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
  }, [rawIdentifier, getApiEndpoint, router, tenantUrl]);

  const deptHead = department?.dept_head;
  const descriptionHtml = department?.description || department?.detailed_description || '';

  // Get head initials if image not present
  const headInitials = deptHead?.name
    ? deptHead.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'DH';

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-5xl mx-auto space-y-6">

        {/* Top Breadcrumbs & Department Tag */}
        <div className="flex items-center justify-between">
          <Link
            href={tenantUrl('/departments')}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <FiArrowLeft className="w-3.5 h-3.5" /> Back to All Departments
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
              Academic Department
            </span>
            {department?.slug && (
              <span className="hidden sm:inline-block text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 px-2.5 py-1 rounded-md">
                /{department.slug}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="w-full h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse" />
            <div className="w-full h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse" />
          </div>
        ) : department ? (
          <div className="space-y-6">

            {/* ========================================================================= */}
            {/* DEPARTMENT HEAD PROFILE CARD (image, name, designation, title)           */}
            {/* ========================================================================= */}
            {deptHead ? (
              <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl overflow-hidden relative">
                {/* Background ambient lighting */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
                  {/* Head Profile Image & Status Pill */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800 flex items-center justify-center ring-4 ring-white/5">
                      {deptHead.image && !imageError ? (
                        <Image
                          src={deptHead.image}
                          alt={deptHead.name || 'Department Head'}
                          fill
                          className="object-cover"
                          sizes="144px"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900 text-white">
                          <span className="text-3xl font-extrabold tracking-wider font-mono">
                            {headInitials}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-blue-200 mt-1">
                            Leadership
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold tracking-wide uppercase shadow-xs">
                      <FiAward className="w-3.5 h-3.5 text-amber-300" />
                      <span>Department Head</span>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="flex-1 text-center md:text-left space-y-3.5 min-w-0">
                    <div>
                      {/* Designation and Title badges */}
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                        {deptHead.designation && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                            {deptHead.designation}
                          </span>
                        )}
                        {deptHead.title && (
                          <span className="text-xs font-medium text-slate-300">
                            {deptHead.title}
                          </span>
                        )}
                      </div>

                      {/* Head Name */}
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {deptHead.name}
                      </h2>
                    </div>

                    {/* Department Head's Welcome Note / Message */}
                    {deptHead.message ? (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed italic relative">
                        <FiMessageSquare className="w-4 h-4 text-blue-400 mb-1.5 opacity-80" />
                        &ldquo;{deptHead.message}&rdquo;
                      </div>
                    ) : deptHead.bio ? (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {deptHead.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Leading academic faculty, pedagogical standards, and student research excellence within the{' '}
                        {department.name}.
                      </p>
                    )}

                    {/* Contact & Tenure Credentials */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-slate-300 border-t border-white/10">
                      {deptHead.email && (
                        <a
                          href={`mailto:${deptHead.email}`}
                          className="flex items-center gap-1.5 hover:text-white hover:underline transition-colors"
                        >
                          <FiMail className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="break-all">{deptHead.email}</span>
                        </a>
                      )}
                      {deptHead.phone && (
                        <a
                          href={`tel:${deptHead.phone}`}
                          className="flex items-center gap-1.5 hover:text-white hover:underline transition-colors"
                        >
                          <FiPhone className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{deptHead.phone}</span>
                        </a>
                      )}
                      {deptHead.joining_date && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <FiCalendar className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>
                            Appointed:{' '}
                            {new Date(deptHead.joining_date).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback when no department head is configured */
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <FiUser className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Department Leadership
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Faculty administration and department head appointment is managed under the institutional registrar office.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* DEPARTMENT OVERVIEW & DANGEROUSLY RENDERED DESCRIPTION                   */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Header Badges & Discipline Meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  {department.code && (
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                      Code: {department.code}
                    </span>
                  )}
                  {department.slug && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      slug: {department.slug}
                    </span>
                  )}
                </div>

                {department.expected_cost && parseFloat(department.expected_cost) > 0 && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <span>Estimated Commitment:</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">
                      ৳{parseFloat(department.expected_cost).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                      / academic session
                    </span>
                  </div>
                )}
              </div>

              {/* Title and Motto */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {department.name}
                </h1>
                {department.motto && (
                  <p className="text-sm italic font-medium text-blue-700 dark:text-blue-400 mt-1.5">
                    &ldquo;{department.motto}&rdquo;
                  </p>
                )}
              </div>

              {/* Department Summary Scope Box */}
              {department.summary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400 block">
                    Discipline Scope &amp; Focus
                  </span>
                  <p>{department.summary}</p>
                </div>
              )}

              {/* DANGEROUSLY RENDERED DESCRIPTION (HTML content) */}
              {descriptionHtml ? (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div
                    className="department-rendered-content prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed
                      [&>h1]:text-xl [&>h1]:sm:text-2xl [&>h1]:font-extrabold [&>h1]:text-slate-900 [&>h1]:dark:text-white [&>h1]:tracking-tight [&>h1]:mb-3 [&>h1]:mt-6
                      [&>h2]:text-base [&>h2]:sm:text-lg [&>h2]:font-bold [&>h2]:text-slate-900 [&>h2]:dark:text-white [&>h2]:mt-6 [&>h2]:mb-2 [&>h2]:border-b [&>h2]:border-slate-100 [&>h2]:dark:border-slate-800 [&>h2]:pb-1.5
                      [&>h3]:text-sm [&>h3]:sm:text-base [&>h3]:font-semibold [&>h3]:text-slate-800 [&>h3]:dark:text-slate-200 [&>h3]:mt-4 [&>h3]:mb-1.5
                      [&>p]:mb-3 [&>p]:leading-relaxed
                      [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:space-y-1.5
                      [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol]:space-y-1.5
                      [&>li]:leading-relaxed
                      [&>table]:w-full [&>table]:border-collapse [&>table]:my-4
                      [&_th]:bg-slate-100 [&_th]:dark:bg-slate-800 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs
                      [&_td]:p-2 [&_td]:border-b [&_td]:border-slate-100 [&_td]:dark:border-slate-800 [&_td]:text-xs"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Detailed curriculum description for this department is currently being finalized.
                </div>
              )}
            </div>

            {/* Department Faculty Members (if any exist) */}
            {department.teachers && department.teachers.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FiLayers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Department Faculty &amp; Instructors
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {department.teachers.length} Faculty Members
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {department.teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={tenantUrl(`/teachers/${teacher.username || teacher.id}`)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-3 group"
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
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {teacher.name?.[0] || 'T'}
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

            {/* Bottom Inquiries CTA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Interested in Enrolling or Academic Collaboration?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                  Contact the department directly or review active admission circulars to submit your application online.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={tenantUrl('/contact')}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Contact Department
                </Link>
                <Link
                  href={tenantUrl('/admission')}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  Apply Online
                </Link>
              </div>
            </div>

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

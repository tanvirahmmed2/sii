'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const TeacherPublicProfilePage = () => {
  const params = useParams();
  const { username } = params;
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    const fetchData = async () => {
      try {
        const res = await fetch(getApiEndpoint(`home/teachers/${username}`));
        if (res.ok) {
          const data = await res.json();
          setTeacher(data.payload?.teacher || data.paylod?.teacher || null);
        }
      } catch (err) {
        console.error('Error fetching teacher profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, getApiEndpoint]);

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <Link
          href={tenantUrl('/teachers')}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:text-primary transition-all shadow-xs"
        >
          &larr; Back to Faculty Roster
        </Link>
        {teacher?.username && (
          <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            @{teacher.username}
          </span>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 animate-pulse space-y-4 shadow-xs">
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      ) : teacher ? (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xs">
            <div className="w-28 h-28 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
              {teacher.image ? (
                <Image
                  width={200}
                  height={200}
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover"
                  unoptimized={teacher.image.startsWith('http')}
                />
              ) : (
                <span className="text-2xl font-serif font-semibold text-primary">
                  {teacher.name?.charAt(0) || 'F'}
                </span>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                  {teacher.name}
                </h1>
                <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
                  {teacher.designation || 'Faculty Member'}
                </span>
              </div>

              {teacher.email && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
                  Email: {teacher.email}
                </p>
              )}

              {teacher.bio && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {teacher.bio}
                </p>
              )}
            </div>
          </div>

          {/* Academic & Personal Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {teacher.blood_group && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-center space-y-1 shadow-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Blood Group</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{teacher.blood_group}</p>
              </div>
            )}
            {teacher.nationality && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-center space-y-1 shadow-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Nationality</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{teacher.nationality}</p>
              </div>
            )}
            {teacher.gender && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-center space-y-1 shadow-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Gender</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{teacher.gender}</p>
              </div>
            )}
            {teacher.date_of_birth && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-center space-y-1 shadow-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Birth Date</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {new Date(teacher.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Split View: Qualifications & Experiences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Qualifications */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  Academic Qualifications ({teacher.qualifications?.length || 0})
                </h2>
              </div>
              {!teacher.qualifications?.length ? (
                <p className="text-xs text-slate-400 py-6 text-center">No qualifications recorded.</p>
              ) : (
                <div className="space-y-3">
                  {teacher.qualifications.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {q.degree}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Year: {q.passing_year}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{q.institution}</p>
                      {q.result && (
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 inline-block font-semibold">
                          Result: {q.result}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  Professional Experience ({teacher.experiences?.length || 0})
                </h2>
              </div>
              {!teacher.experiences?.length ? (
                <p className="text-xs text-slate-400 py-6 text-center">No experience entries recorded.</p>
              ) : (
                <div className="space-y-3">
                  {teacher.experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {exp.title}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {formatDate(exp.start_date)} &ndash;{' '}
                          {exp.is_current ? (
                            <span className="text-primary font-bold">Present</span>
                          ) : (
                            formatDate(exp.end_date)
                          )}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{exp.organization}</p>
                      {exp.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
            Faculty Profile Not Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            The requested faculty profile does not exist or has been deactivated.
          </p>
          <Link
            href={tenantUrl('/teachers')}
            className="inline-block mt-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:text-primary transition-all shadow-xs"
          >
            Return to Faculty List
          </Link>
        </div>
      )}
    </div>
  );
};

export default TeacherPublicProfilePage;

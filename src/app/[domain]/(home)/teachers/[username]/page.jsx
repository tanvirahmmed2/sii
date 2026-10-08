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
        const res = await fetch(getApiEndpoint(`teachers/${username}`));
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-4 transition-colors">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <Link
          href={tenantUrl('/teachers')}
          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
        >
          &larr; Back to Faculty Roster
        </Link>
        {teacher?.username && (
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
            @{teacher.username}
          </span>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 animate-pulse space-y-4">
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      ) : teacher ? (
        <div className="space-y-4">
          {/* Profile Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-24 h-24 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
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
                <span className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                  {teacher.name?.charAt(0) || 'F'}
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  {teacher.name}
                </h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  {teacher.designation || 'Faculty Member'}
                </span>
              </div>

              {teacher.email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Email: {teacher.email}
                </p>
              )}

              {teacher.bio && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {teacher.bio}
                </p>
              )}
            </div>
          </div>

          {/* Academic & Personal Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {teacher.blood_group && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-mono text-slate-400">Blood Group</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{teacher.blood_group}</p>
              </div>
            )}
            {teacher.nationality && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-mono text-slate-400">Nationality</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{teacher.nationality}</p>
              </div>
            )}
            {teacher.gender && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-mono text-slate-400">Gender</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{teacher.gender}</p>
              </div>
            )}
            {teacher.date_of_birth && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-mono text-slate-400">Birth Date</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {new Date(teacher.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Split View: Qualifications & Experiences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Qualifications */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  Academic Qualifications ({teacher.qualifications?.length || 0})
                </h2>
              </div>
              {!teacher.qualifications?.length ? (
                <p className="text-xs text-slate-400 py-4 text-center">No qualifications recorded.</p>
              ) : (
                <div className="space-y-2">
                  {teacher.qualifications.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                          {q.degree}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Year: {q.passing_year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{q.institution}</p>
                      {q.result && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 inline-block">
                          Result: {q.result}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  Professional Experience ({teacher.experiences?.length || 0})
                </h2>
              </div>
              {!teacher.experiences?.length ? (
                <p className="text-xs text-slate-400 py-4 text-center">No experience entries recorded.</p>
              ) : (
                <div className="space-y-2">
                  {teacher.experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                          {exp.title}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {formatDate(exp.start_date)} &ndash;{' '}
                          {exp.is_current ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Present</span>
                          ) : (
                            formatDate(exp.end_date)
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{exp.organization}</p>
                      {exp.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Faculty Profile Not Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested faculty profile does not exist or has been deactivated.
          </p>
          <Link
            href={tenantUrl('/teachers')}
            className="inline-block mt-2 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Return to Faculty List
          </Link>
        </div>
      )}
    </div>
  );
};

export default TeacherPublicProfilePage;

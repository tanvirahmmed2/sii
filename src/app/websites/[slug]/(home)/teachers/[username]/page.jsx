'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiMail, FiAward, FiBookOpen, FiUser, FiBriefcase,
  FiCheckCircle, FiStar, FiDroplet, FiGlobe, FiCalendar, FiClock
} from 'react-icons/fi';
import Image from 'next/image';

const TeacherPublicProfilePage = () => {
  const params = useParams();
  const { username } = params;

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/teachers/${username}`);
        if (res.ok) {
          const data = await res.json();
          setTeacher(data.paylod?.teacher || null);
        }
      } catch (err) {
        console.error('Error fetching teacher:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const getInitials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'T';

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/teachers" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-2xs">
            <FiArrowLeft className="text-sm" /> Back to Faculty
          </Link>
          {teacher?.username && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">@{teacher.username}</span>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-2xs space-y-6 animate-pulse">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-28 h-28 bg-slate-200 rounded-3xl" />
              <div className="space-y-3 w-full max-w-md">
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
            <div className="h-32 bg-slate-100 rounded-2xl" />
          </div>
        ) : teacher ? (
          <div className="space-y-6 animate-fade-up">

            {/* Profile Header Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
              <div className="h-36 bg-linear-to-tr from-primary-light to-primary-dark relative">
                <div className="absolute top-4 right-5 flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold rounded-full border border-white/30 uppercase tracking-wider">
                    {teacher.designation || 'Faculty Member'}
                  </span>
                </div>
              </div>

              <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-14">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                  <div className="w-28 h-28 rounded-3xl ring-4 ring-white shadow-lg overflow-hidden shrink-0">
                    {teacher.image ? (
                      <Image width={400} height={400} src={teacher.image} alt={teacher.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-tr from-primary-light to-primary-dark text-white flex items-center justify-center text-3xl font-bold">
                        {getInitials(teacher.name)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 mb-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight">{teacher.name}</h1>
                     
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                      <FiBriefcase className="text-primary text-xs" /> {teacher.designation || 'Faculty Member'}
                    </p>
                    {teacher.bio && (
                      <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">{teacher.bio}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-xs font-medium">
                  {teacher.email && (
                    <a href={`mailto:${teacher.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-white hover:border-primary transition-all text-slate-700">
                      <FiMail className="text-primary" /> {teacher.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Info Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: FiDroplet, label: 'Blood Group', value: teacher.blood_group },
                { icon: FiGlobe, label: 'Nationality', value: teacher.nationality },
                { icon: FiCalendar, label: 'Date of Birth', value: teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                { icon: FiUser, label: 'Gender', value: teacher.gender },
              ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="text-primary text-xs" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Qualifications */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FiAward className="text-primary text-base" /> Qualifications ({teacher.qualifications?.length || 0})
                  </h2>
                </div>
                {!teacher.qualifications?.length ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">No qualifications recorded.</div>
                ) : (
                  <div className="space-y-3">
                    {teacher.qualifications.map((q) => (
                      <div key={q.id} className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl flex items-center justify-between hover:bg-white transition-all">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 text-xs">{q.degree}</h3>
                          <p className="text-[11px] font-medium text-slate-500">{q.institution}</p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="px-2 py-0.5 bg-slate-200/70 text-slate-600 text-[10px] font-semibold rounded-md">Year: {q.passing_year}</span>
                            {q.result && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-semibold rounded-md">{q.result}</span>}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FiBookOpen className="text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Experiences */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FiStar className="text-primary text-base" /> Experience ({teacher.experiences?.length || 0})
                  </h2>
                </div>
                {!teacher.experiences?.length ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">No experience entries recorded.</div>
                ) : (
                  <div className="space-y-3">
                    {teacher.experiences.map((exp) => (
                      <div key={exp.id} className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl hover:bg-white transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5 flex-1">
                            <h3 className="font-bold text-slate-800 text-xs">{exp.title}</h3>
                            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                              <FiBriefcase className="text-[10px]" /> {exp.organization}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <FiClock className="text-[10px]" />
                              {formatDate(exp.start_date)} – {exp.is_current ? <span className="text-emerald-500 font-semibold">Present</span> : formatDate(exp.end_date)}
                            </p>
                            {exp.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{exp.description}</p>}
                          </div>
                          {exp.is_current && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-full shrink-0">Current</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
              <FiUser />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Teacher Profile Not Found</h3>
            <p className="text-xs text-slate-400">The requested faculty profile does not exist or has been deactivated.</p>
            <Link href="/teachers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-2">
              <FiArrowLeft className="text-xs" /> View All Faculty
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherPublicProfilePage;

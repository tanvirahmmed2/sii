'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentHomePage = () => {
  const { getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [todayRoutine, setTodayRoutine] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [profileResult, statsResult] = await Promise.allSettled([
          fetch(getApiEndpoint('student/me')),
          fetch(getApiEndpoint('student/dashboard')),
        ]);

        let resolvedStudent = null;

        if (profileResult.status === 'fulfilled' && profileResult.value.ok) {
          try {
            const profileData = await profileResult.value.json();
            const profilePayload = profileData.payload || profileData.paylod || profileData;
            resolvedStudent = profilePayload?.student || profileData?.student || null;
          } catch (e) {
            console.warn('Failed to parse student profile JSON:', e);
          }
        }

        if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
          try {
            const statsData = await statsResult.value.json();
            const statsPayload = statsData.payload || statsData.paylod || statsData;

            if (!resolvedStudent) {
              resolvedStudent = statsPayload?.student || statsData?.student || null;
            } else if (statsPayload?.student || statsData?.student) {
              resolvedStudent = {
                ...(statsPayload?.student || statsData?.student),
                ...resolvedStudent,
              };
            }

            if (isMounted) {
              setStats(statsPayload?.stats || statsData?.stats || null);
              setTodayRoutine(statsPayload?.todayRoutine || statsData?.todayRoutine || []);
              setUpcomingExams(statsPayload?.upcomingExams || statsData?.upcomingExams || []);
            }
          } catch (e) {
            console.warn('Failed to parse student dashboard stats JSON:', e);
          }
        }

        if (isMounted && resolvedStudent) {
          setProfile(resolvedStudent);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const pendingDues = (stats?.unpaidFeesCount || 0) + (stats?.unpaidFinesCount || 0);

  const kpis = [
    {
      title: 'Enrolled Subjects',
      value: stats?.subjectsCount || 0,
      subText: 'Active class courses',
      link: '/student/subjects',
    },
    {
      title: 'Attendance Rate',
      value: `${stats?.attendanceRate || 100}%`,
      subText: `${stats?.presentAttendanceDays || 0}/${stats?.totalAttendanceDays || 0} class sessions logged`,
      link: '/student/attendance',
    },
    {
      title: 'Outstanding Fees',
      value: pendingDues,
      subText: pendingDues > 0 ? 'Pending payment balance' : 'No outstanding fees',
      link: '/student/fees',
      isWarning: pendingDues > 0,
    },
    {
      title: 'Campus Clubs',
      value: stats?.clubsCount || 0,
      subText: 'Active club memberships',
      link: '/student/clubs',
    },
  ];

  const quickLinks = [
    { label: 'Class Routine', desc: 'Weekly schedule & room allocation', href: '/student/routine' },
    { label: 'Assignments', desc: 'View homework & coursework submissions', href: '/student/assignments' },
    { label: 'Academic Results', desc: 'Term GPAs, marks & transcripts', href: '/student/results' },
    { label: 'Exam Admit Cards', desc: 'Download examination entry passes', href: '/student/cards' },
    { label: 'Tuition Fees', desc: 'Pay fees, view invoices & ledgers', href: '/student/fees' },
    { label: 'Classrooms LMS', desc: 'Online lectures & class notes', href: '/student/classrooms' },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Top Banner / Student Identity Bar */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              {profile?.name || 'Student Portal'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              Enrolled Student
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Welcome to your academic workstation. Manage course materials, attendance, exam permits, and tuition fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
          <span className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            Reg: <strong className="text-slate-900 dark:text-white">{profile?.registration_number || profile?.registration_no || profile?.student_unique_id || 'N/A'}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            Class: <strong className="text-slate-900 dark:text-white">{profile?.class_name || 'General Enrollment'} {profile?.section_name ? `(${profile.section_name})` : ''}</strong>
          </span>
          {(profile?.roll || profile?.roll_no) && (
            <span className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Roll: #{profile.roll || profile.roll_no}
            </span>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, idx) => (
          <Link
            key={idx}
            href={tenantUrl(kpi.link)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-md p-4 transition flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {kpi.title}
              </span>
              <span
                className={`text-lg font-semibold font-mono ${
                  kpi.isWarning ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {kpi.value}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{kpi.subText}</p>
          </Link>
        ))}
      </div>

      {/* Two Column Layout: Today's Routine & Upcoming Exams */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Routine */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Today&apos;s Class Routine
              </h2>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <Link
              href={tenantUrl('/student/routine')}
              className="px-2.5 py-1 text-xs font-medium text-primary hover:underline"
            >
              Full Routine
            </Link>
          </div>

          {todayRoutine.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
              No classes scheduled for today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2 px-3 font-medium">Time</th>
                    <th className="py-2 px-3 font-medium">Subject</th>
                    <th className="py-2 px-3 font-medium">Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {todayRoutine.map((slot, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {slot.start_time} - {slot.end_time}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                        {slot.subject_name}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {slot.teacher_name || 'Faculty Member'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Upcoming Examination Schedules
              </h2>
              <p className="text-xs text-slate-400">Published term assessments</p>
            </div>
            <Link
              href={tenantUrl('/student/exams')}
              className="px-2.5 py-1 text-xs font-medium text-primary hover:underline"
            >
              All Exams
            </Link>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
              No upcoming examinations scheduled.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2 px-3 font-medium">Exam Name</th>
                    <th className="py-2 px-3 font-medium">Term</th>
                    <th className="py-2 px-3 font-medium">Date</th>
                    <th className="py-2 px-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {upcomingExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                        {exam.name}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          {exam.term || 'Term Final'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'TBA'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          href={tenantUrl('/student/cards')}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
                        >
                          Admit Card
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Workstation Quick Navigation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Direct access to core academic operations and records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((ql, idx) => (
            <Link
              key={idx}
              href={tenantUrl(ql.href)}
              className="p-3 rounded-md border border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition space-y-1"
            >
              <div className="text-xs font-medium text-slate-900 dark:text-white">
                {ql.label}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{ql.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentHomePage;
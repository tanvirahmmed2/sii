'use client';

import React, { useEffect, useState } from 'react';
import { FiUser, FiBookOpen, FiCalendar, FiDollarSign, FiClock, FiAward, FiActivity } from 'react-icons/fi';
import Link from 'next/link';

const TeacherHomePage = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([fetch('/api/teacher/me'), fetch('/api/teacher/dashboard')]);
        if (profileRes.ok && statsRes.ok) {
          const profileData = await profileRes.json();
          const statsData = await statsRes.json();
          setProfile(profileData.paylod?.teacher);
          setStats(statsData.paylod?.stats);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="w-full py-16 text-center text-xs text-slate-400">Loading dashboard...</div>;
  }

  const welcomeMessage = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const statCards = [
    { title: 'Assigned Subjects', value: stats?.subjectsCount || 0, icon: FiBookOpen, link: '/teacher/subjects' },
    { title: 'Students Taught', value: stats?.studentsCount || 0, icon: FiUser, link: '/teacher/subjects' },
    { title: 'Pending Leaves', value: stats?.pendingLeavesCount || 0, icon: FiCalendar, link: '/teacher/leaves' },
    { title: 'Salary Received', value: `৳${(stats?.salaryReceived || 0).toLocaleString()}`, icon: FiDollarSign, link: '/teacher/salary' },
  ];

  const shortcuts = [
    { label: 'Class Schedule', sub: 'Daily timetable', icon: FiClock, href: '/teacher/schedule' },
    { label: 'Attendance', sub: 'Student roll logs', icon: FiCalendar, href: '/teacher/attendance' },
    { label: 'Evaluate Marks', sub: 'Record exam marks', icon: FiAward, href: '/teacher/marks' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-800">
            {welcomeMessage()}, {profile?.name || 'Teacher'}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {profile?.designation || 'Teacher'} · {profile?.email}
          </p>
        </div>
        <span className="text-xs text-slate-400">{profile?.number}</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.link}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-primary/40 transition-colors flex flex-col gap-2"
            >
              <Icon className="text-primary text-sm" />
              <span className="text-xl font-bold text-slate-800">{card.value}</span>
              <span className="text-xs text-slate-500 font-medium">{card.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Shortcuts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FiActivity className="text-primary" /> Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {shortcuts.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Link
                key={idx}
                href={s.href}
                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-primary/40 hover:bg-slate-50 transition-colors"
              >
                <div className="p-2 bg-primary/5 rounded-lg text-primary">
                  <Icon className="text-sm" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                  <p className="text-[10px] text-slate-400">{s.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeacherHomePage;
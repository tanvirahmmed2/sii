'use client';

import React, { useEffect, useState } from 'react';
import { 
  FiUser, FiUsers, FiBookOpen, FiActivity, FiDollarSign, 
  FiAward, FiCalendar, FiClock, FiCheckSquare, FiArrowRight,
  FiFileText
} from 'react-icons/fi';
import Link from 'next/link';

const StudentHomePage = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch('/api/student/me'),
          fetch('/api/student/dashboard')
        ]);

        if (profileRes.ok && statsRes.ok) {
          const profileData = await profileRes.json();
          const statsData = await statsRes.json();
          setProfile(profileData.paylod?.student || profileData.payload?.student || profileData.student || null);
          setStats(statsData.paylod?.stats || statsData.payload?.stats || statsData.stats || null);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading your dashboard...</p>
      </div>
    );
  }

  const welcomeMessage = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const pendingDues = (stats?.unpaidFeesCount || 0) + (stats?.unpaidFinesCount || 0);

  const statCards = [
    {
      title: 'Subjects & Coursework',
      value: stats?.subjectsCount || 0,
      subText: 'Enrolled subjects',
      icon: FiBookOpen,
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      link: '/student/subjects'
    },
    {
      title: 'Attendance Rate',
      value: `${stats?.attendanceRate || 100}%`,
      subText: `${stats?.presentAttendanceDays || 0}/${stats?.totalAttendanceDays || 0} class days logged`,
      icon: FiActivity,
      iconBg: stats?.attendanceRate < 75 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600',
      link: '/student/attendance'
    },
    {
      title: 'Unpaid Fees & Fines',
      value: pendingDues,
      subText: pendingDues > 0 ? 'Pending payment dues' : 'All clear! No pending dues',
      icon: FiDollarSign,
      iconBg: pendingDues > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-500/10 text-slate-600',
      link: '/student/fees'
    },
    {
      title: 'Co-curricular Clubs',
      value: stats?.clubsCount || 0,
      subText: 'Active club memberships',
      icon: FiUsers,
      iconBg: 'bg-indigo-500/10 text-indigo-600',
      link: '/student/clubs'
    }
  ];

  const quickActions = [
    {
      title: 'Class Routine',
      desc: 'Check your daily timetable & rooms',
      icon: FiClock,
      href: '/student/routine',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Assignments',
      desc: 'View & submit homework tasks',
      icon: FiCheckSquare,
      href: '/student/assignments',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'Marks & Results',
      desc: 'Review exam performance & grades',
      icon: FiAward,
      href: '/student/results',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      title: 'Admit Cards',
      desc: 'Download hall tickets for exams',
      icon: FiFileText,
      href: '/student/cards',
      color: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Fees & Payment',
      desc: 'Pay tuition fees & check receipts',
      icon: FiDollarSign,
      href: '/student/fees',
      color: 'bg-rose-50 text-rose-600'
    },
    {
      title: 'My Profile',
      desc: 'Manage account & details',
      icon: FiUser,
      href: '/student/profile',
      color: 'bg-indigo-50 text-indigo-600'
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg shadow-emerald-900/10">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden shadow-inner">
              {profile?.image ? (
                <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
              ) : profile?.name ? (
                profile.name.charAt(0).toUpperCase()
              ) : (
                <FiUser />
              )}
            </div>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 backdrop-blur-md mb-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Academic Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
                {welcomeMessage()}, {profile?.name || 'Student'} 👋
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed font-normal">
                Welcome back to your dashboard. Stay on top of your class routine, track attendance, and manage assignments seamlessly.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 min-w-[220px] shadow-inner">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block mb-2">
              Student Details
            </span>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-emerald-100 text-xs font-medium">Class:</span>
                <span className="font-semibold text-white">{profile?.class_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-emerald-100 text-xs font-medium">Section:</span>
                <span className="font-semibold text-white">{profile?.section_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1.5">
                <span className="text-emerald-100 text-xs font-medium">Reg No:</span>
                <span className="font-mono text-xs font-semibold text-emerald-200">{profile?.registration_number || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link 
              key={idx} 
              href={card.link}
              className="group bg-white border border-slate-200/70 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.iconBg} transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className="text-xl" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                  {card.value}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-emerald-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-xs font-normal">{card.subText}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Access Grid */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Quick Navigation</h2>
            <p className="text-xs text-slate-400 font-medium">Fast access to key student modules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link 
                key={idx}
                href={action.href}
                className="group flex items-center justify-between p-4 border border-slate-100 hover:border-emerald-200 rounded-2xl bg-slate-50/40 hover:bg-emerald-50/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${action.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-slate-400 text-xs">{action.desc}</p>
                  </div>
                </div>
                <FiArrowRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentHomePage;
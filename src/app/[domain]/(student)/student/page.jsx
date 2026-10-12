'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { 
  FiUser, FiUsers, FiBookOpen, FiActivity, FiDollarSign, 
  FiAward, FiCalendar, FiClock, FiCheckSquare, FiArrowRight,
  FiFileText, FiCheckCircle
} from 'react-icons/fi';
import Link from 'next/link';

const StudentHomePage = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [todayRoutine, setTodayRoutine] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
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
          const profilePayload = profileData.payload || profileData.paylod || profileData;
          const statsPayload = statsData.payload || statsData.paylod || statsData;

          setProfile(profilePayload.student || null);
          setStats(statsPayload.stats || null);
          setTodayRoutine(statsPayload.todayRoutine || []);
          setUpcomingExams(statsPayload.upcomingExams || []);
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
    return <TenantLoader fullScreen={false} />;
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
      subText: 'Enrolled academic subjects',
      icon: FiBookOpen,
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      link: '/student/subjects'
    },
    {
      title: 'Attendance Rate',
      value: `${stats?.attendanceRate || 100}%`,
      subText: `${stats?.presentAttendanceDays || 0}/${stats?.totalAttendanceDays || 0} class sessions logged`,
      icon: FiActivity,
      iconBg: stats?.attendanceRate < 75 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600',
      link: '/student/attendance'
    },
    {
      title: 'Unpaid Fees & Dues',
      value: pendingDues,
      subText: pendingDues > 0 ? 'Pending payment ledger balance' : 'All clear! No outstanding fees',
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
      desc: 'Check weekly schedule & hall rooms',
      icon: FiClock,
      href: '/student/routine',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Assignments & LMS',
      desc: 'View & submit homework tasks',
      icon: FiCheckSquare,
      href: '/student/assignments',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'Marks & Results',
      desc: 'Review term performance & GPAs',
      icon: FiAward,
      href: '/student/results',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      title: 'Admit Cards',
      desc: 'Download examination permits',
      icon: FiFileText,
      href: '/student/cards',
      color: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Tuition Fees',
      desc: 'Pay tuition fees & check receipts',
      icon: FiDollarSign,
      href: '/student/fees',
      color: 'bg-rose-50 text-rose-600'
    },
    {
      title: 'Testimonials',
      desc: 'Apply for certificates & passes',
      icon: FiAward,
      href: '/student/testimonial',
      color: 'bg-teal-50 text-teal-600'
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg shadow-emerald-900/10">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden shadow-inner">
              {profile?.photo_url || profile?.image ? (
                <img src={profile.photo_url || profile.image} alt={profile.name} className="w-full h-full object-cover" />
              ) : profile?.name ? (
                profile.name.charAt(0).toUpperCase()
              ) : (
                <FiUser />
              )}
            </div>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 backdrop-blur-md mb-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Official Student Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
                {welcomeMessage()}, {profile?.name || 'Student'} 👋
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed font-normal">
                Welcome back to your academic portal. Track your classes, submit assignments, verify fees, and stay updated with your curriculum.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 min-w-[220px] shadow-inner">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block mb-2">
              Identity Profile
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
                <span className="font-mono text-xs font-semibold text-emerald-200">{profile?.registration_number || profile?.registration_no || 'N/A'}</span>
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
                <span className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight font-mono">
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

      {/* Two-Column Tables Section: Today's Routine & Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Timetable Table */}
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FiClock className="text-emerald-600" /> Today's Class Routine
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <Link 
                href="/student/routine"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Full Routine <FiArrowRight />
              </Link>
            </div>

            {todayRoutine.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                No classes scheduled for today. Enjoy your study break!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3 rounded-l-lg">Time</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayRoutine.map((slot, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {slot.start_time} - {slot.end_time}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{slot.subject_name}</p>
                          {slot.subject_code && (
                            <span className="text-[10px] text-slate-400 font-mono">({slot.subject_code})</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {slot.teacher_name || 'Faculty Member'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Examination Schedule Table */}
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FiAward className="text-purple-600" /> Upcoming Examinations
                </h3>
                <p className="text-xs text-slate-400 font-medium">Scheduled class examinations</p>
              </div>
              <Link 
                href="/student/exams"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View Exams <FiArrowRight />
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                No upcoming term examinations scheduled at this time.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3 rounded-l-lg">Exam Name</th>
                      <th className="py-2.5 px-3">Term</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Permit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {exam.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {exam.term || 'Term Final'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'TBA'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link 
                            href="/student/cards"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[11px] font-bold text-slate-700 transition-colors inline-block"
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
      </div>

      {/* Quick Access Grid */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Quick Navigation</h2>
            <p className="text-xs text-slate-400 font-medium">Direct access to core academic features</p>
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
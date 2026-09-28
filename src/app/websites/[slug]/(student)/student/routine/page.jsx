'use client';

import React, { useEffect, useState } from 'react';
import { FiClock, FiBook, FiUser, FiInfo, FiCalendar, FiMapPin } from 'react-icons/fi';

const RoutinePage = () => {
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const [activeTab, setActiveTab] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return daysOfWeek.includes(today) ? today : 'Monday';
  });

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const res = await fetch('/api/student/routine');
        if (res.ok) {
          const data = await res.json();
          setRoutine(data.paylod?.routine || []);
        }
      } catch (error) {
        console.error('Error fetching routine:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading your timetable...</p>
      </div>
    );
  }

  // Filter routines by active tab day
  const dailyClasses = routine.filter((r) => r.day_of_week === activeTab);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar /> Timetable & Schedule
          </div>
          <h1 className="text-2xl font-bold text-slate-800">My Class Routine</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Keep track of daily subject schedules, teacher assignments, and classroom locations.
          </p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-semibold w-fit">
          Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Weekday Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {daysOfWeek.map((day) => {
          const count = routine.filter((r) => r.day_of_week === day).length;
          const isActive = activeTab === day;
          return (
            <button
              key={day}
              onClick={() => setActiveTab(day)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-bold'
                  : 'bg-white border border-slate-200/70 text-slate-600 hover:border-emerald-300 hover:text-slate-800'
              }`}
            >
              <span>{day}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timetable Cards Grid */}
      {dailyClasses.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Classes Scheduled</h3>
          <p className="text-slate-400 text-xs max-w-xs">
            There are no classes listed for {activeTab}. Enjoy your study break!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dailyClasses.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/70 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                    <FiClock className="text-emerald-600" />
                    <span>{item.start_time} - {item.end_time}</span>
                  </div>
                  {item.subject_code && (
                    <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.subject_code}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-1">{item.subject_name}</h3>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <FiUser className="text-xs" />
                  </div>
                  <span><strong className="font-semibold text-slate-700">Teacher:</strong> {item.teacher_name || 'Assigned soon'}</span>
                </div>
                {item.room_number && (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <FiMapPin className="text-xs" />
                    </div>
                    <span><strong className="font-semibold text-slate-700">Room:</strong> {item.room_number}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoutinePage;

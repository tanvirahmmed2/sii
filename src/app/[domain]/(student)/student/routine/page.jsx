'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { 
  FiClock, FiBook, FiUser, FiInfo, FiCalendar, 
  FiMapPin, FiPrinter, FiGrid, FiList 
} from 'react-icons/fi';

const RoutinePage = () => {
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
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
          const list = data.payload?.routine || data.paylod?.routine || data.routine || [];
          setRoutine(list);
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
    return <TenantLoader fullScreen={false} />;
  }

  // Filter routines by active tab day
  const dailyClasses = routine.filter((r) => r.day_of_week === activeTab);

  // Group classes by day for the Weekly Master Table
  const activeDays = daysOfWeek.filter(day => routine.some(r => r.day_of_week === day));
  const displayDays = activeDays.length > 0 ? activeDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  return (
    <div className="flex flex-col gap-6 w-full pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar /> Timetable & Academic Calendar
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Class Routine & Timetable</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Keep track of weekly subject slots, assigned subject faculty, and campus classroom locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Weekly Master Table"
            >
              <FiList className="text-sm" /> <span className="hidden sm:inline">Weekly Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Daily Cards"
            >
              <FiGrid className="text-sm" /> <span className="hidden sm:inline">Day View</span>
            </button>
          </div>

          <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-bold shrink-0">
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {routine.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Timetable Published</h3>
          <p className="text-slate-400 text-xs max-w-xs">
            Academic administration has not released the timetable schedule for your class section yet.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* WEEKLY MASTER TIMETABLE TABLE */
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Weekly Master Timetable</h2>
              <p className="text-xs text-slate-400 font-medium">Full institutional schedule organized by weekday and period</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              Total Weekly Slots: {routine.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl w-32">Day</th>
                  <th className="py-3 px-4">Time & Period</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4 rounded-r-xl">Classroom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {displayDays.map((day) => {
                  const daySlots = routine.filter(r => r.day_of_week === day);
                  if (daySlots.length === 0) {
                    return (
                      <tr key={day} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 font-bold text-slate-700 bg-slate-50/30">
                          {day}
                        </td>
                        <td colSpan={4} className="py-3.5 px-4 text-xs text-slate-400 italic">
                          No classes scheduled for {day}
                        </td>
                      </tr>
                    );
                  }

                  return daySlots.map((slot, sIdx) => (
                    <tr key={`${day}-${sIdx}`} className="hover:bg-slate-50/60 transition-colors">
                      {sIdx === 0 && (
                        <td 
                          rowSpan={daySlots.length} 
                          className="py-3.5 px-4 font-bold text-slate-800 border-r border-slate-100 align-top bg-slate-50/30"
                        >
                          <span className="sticky top-20 block">{day}</span>
                        </td>
                      )}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <FiClock className="text-emerald-600" />
                          <span>{slot.start_time} - {slot.end_time}</span>
                        </div>
                        {slot.period_name && (
                          <span className="text-[10px] text-slate-400 block">{slot.period_name}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{slot.subject_name}</p>
                        {slot.subject_code && (
                          <span className="text-[10px] text-slate-400 font-mono">Code: {slot.subject_code}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <FiUser className="text-slate-400 text-xs" />
                          <span>{slot.teacher_name || 'Faculty Member'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                          <FiMapPin className="text-[11px] text-emerald-600" />
                          {slot.room_number || 'Room 101'}
                        </span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DAY CARDS VIEW */
        <div className="flex flex-col gap-6">
          {/* Weekday Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {daysOfWeek.map((day) => {
              const count = routine.filter((r) => r.day_of_week === day).length;
              const isActive = activeTab === day;
              return (
                <button
                  key={day}
                  onClick={() => setActiveTab(day)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 font-bold'
                      : 'bg-white border border-slate-200/70 text-slate-600 hover:border-emerald-300'
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

          {dailyClasses.length === 0 ? (
            <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
                <FiInfo className="text-3xl" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">No Classes Scheduled</h3>
              <p className="text-slate-400 text-xs max-w-xs">
                There are no classes scheduled for {activeTab}. Take time for independent review!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dailyClasses.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white border border-slate-200/70 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <FiClock className="text-emerald-600" />
                        <span>{item.start_time} - {item.end_time}</span>
                      </div>
                      {item.subject_code && (
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
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
                      <span><strong>Teacher:</strong> {item.teacher_name || 'Assigned faculty'}</span>
                    </div>
                    {item.room_number && (
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <FiMapPin className="text-xs" />
                        </div>
                        <span><strong>Room:</strong> {item.room_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutinePage;

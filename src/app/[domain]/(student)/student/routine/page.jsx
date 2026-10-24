'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const RoutinePage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'day'

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return daysOfWeek.includes(today) ? today : 'Sunday';
  });

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/routine'));
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
  }, [getApiEndpoint]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const dailyClasses = routine.filter((r) => (r.day_of_week || '').toLowerCase() === activeDay.toLowerCase());
  const activeDays = daysOfWeek.filter((day) => routine.some((r) => (r.day_of_week || '').toLowerCase() === day.toLowerCase()));
  const displayDays = activeDays.length > 0 ? activeDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Class Routine &amp; Timetable
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Weekly academic schedule, room allocations, and assigned subject teachers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Weekly Schedule
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Day View
            </button>
          </div>

          <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono">
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {routine.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-1">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No Timetable Published</p>
          <p className="text-xs text-slate-400">
            Academic administration has not released the timetable for your class section yet.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Weekly Master Table */
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Weekly Master Class Schedule
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive timetable across all operating school days.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-medium w-32">Day</th>
                  <th className="py-2.5 px-3 font-medium">Scheduled Periods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayDays.map((day) => {
                  const daySlots = routine
                    .filter((r) => (r.day_of_week || '').toLowerCase() === day.toLowerCase())
                    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

                  const isToday = day.toLowerCase() === new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

                  return (
                    <tr key={day} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 align-top font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{day}</span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {daySlots.length === 0 ? (
                          <span className="text-slate-400 italic">No classes scheduled</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 min-w-[180px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {slot.subject_name}
                                  </span>
                                  {slot.subject_code && (
                                    <span className="font-mono text-slate-400">({slot.subject_code})</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-300">
                                  {slot.teacher_name || 'Faculty Member'}
                                </div>
                                <div className="text-[10px] font-mono text-primary flex items-center justify-between pt-0.5 border-t border-slate-200 dark:border-slate-700">
                                  <span>{slot.start_time} - {slot.end_time}</span>
                                  <span>{slot.room_number || 'Hall'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Day View with Tab selection */
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            {displayDays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeDay.toLowerCase() === day.toLowerCase()
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {dailyClasses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
              No classes scheduled for {activeDay}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3 font-medium">Time Slot</th>
                    <th className="py-2.5 px-3 font-medium">Period</th>
                    <th className="py-2.5 px-3 font-medium">Subject</th>
                    <th className="py-2.5 px-3 font-medium">Teacher</th>
                    <th className="py-2.5 px-3 font-medium">Room Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dailyClasses
                    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                    .map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {slot.start_time} - {slot.end_time}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {slot.period_name || 'Period'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {slot.subject_name}
                          {slot.subject_code && (
                            <span className="block text-[10px] text-slate-400 font-mono">({slot.subject_code})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {slot.teacher_name || 'Faculty Member'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {slot.room_number || 'Campus Room'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutinePage;

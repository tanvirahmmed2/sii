'use client';

import React, { useEffect, useState } from 'react';
import { FiClock, FiMapPin, FiLayers } from 'react-icons/fi';

const SchedulePage = () => {
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const [activeTab, setActiveTab] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return daysOfWeek.includes(today) ? today : 'Monday';
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch('/api/teacher/schedule');
        if (res.ok) {
          const data = await res.json();
          setRoutine(data.paylod.routine || []);
        }
      } catch (error) {
        console.error('Error fetching routine:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const dailyClasses = routine.filter((r) => r.day_of_week?.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FiClock className="text-primary" /> My Class Schedule
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Your daily teaching routine, classes, and room numbers.</p>
      </div>

      {/* Day Tabs */}
      <div className="flex flex-wrap gap-1">
        {daysOfWeek.map((day) => {
          const count = routine.filter((r) => r.day_of_week === day).length;
          const isActive = activeTab === day;
          return (
            <button
              key={day}
              onClick={() => setActiveTab(day)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                isActive ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {day.slice(0, 3)} {count > 0 && <span className={`ml-1 text-[10px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">Loading schedule...</div>
        ) : dailyClasses.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No classes scheduled on {activeTab}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Class</th>
                  <th className="px-4 py-2.5">Section</th>
                  <th className="px-4 py-2.5">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyClasses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-primary font-semibold text-[11px]">
                        <FiClock className="text-[10px]" /> {item.start_time} – {item.end_time}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{item.subject_name}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{item.subject_code}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <span className="flex items-center gap-1"><FiLayers className="text-slate-400 text-[10px]" /> {item.class_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{item.section_name || '—'}</td>
                    <td className="px-4 py-2.5">
                      {item.room_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                          <FiMapPin className="text-[9px]" /> {item.room_number}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;

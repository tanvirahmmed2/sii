'use client';

import React, { useEffect, useState } from 'react';
import { FiCalendar, FiClock, FiMapPin, FiLayers, FiBook } from 'react-icons/fi';

const TeacherExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch('/api/teacher/exams');
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || {};
          setExams(payload.exams || []);
          setSchedules(payload.schedules || []);
        }
      } catch (error) {
        console.error('Error fetching teacher exam routines:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const filteredExams = selectedStatus === 'all' ? exams : exams.filter((e) => e.status === selectedStatus);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiCalendar className="text-primary" /> Examination Routines
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">View upcoming, active, and completed exam routines.</p>
        </div>
        <div className="flex gap-1">
          {['all', 'current', 'upcoming', 'previous'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                selectedStatus === st ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >{st}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">Loading exams...</div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-10 text-center text-xs text-slate-400">
          No exam routines found for "{selectedStatus}".
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const examSchedules = schedules.filter((s) => s.exam_id === exam.id);
            const startStr = new Date(exam.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const endStr = new Date(exam.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <div key={exam.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Exam header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{exam.name}</span>
                    {exam.term && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">Term: {exam.term}</span>}
                    {exam.class_name && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">Class: {exam.class_name}</span>}
                    <span className="text-[10px] text-slate-500">{startStr} – {endStr}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                    exam.status === 'current' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    exam.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-slate-100 text-slate-500'
                  }`}>{exam.status}</span>
                </div>

                {/* Schedule table */}
                {examSchedules.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400 italic">No timetable entries for this exam.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Class</th>
                          <th className="px-4 py-2">Subject</th>
                          <th className="px-4 py-2">Timing</th>
                          <th className="px-4 py-2">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {examSchedules.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-semibold text-slate-700">
                              {new Date(row.exam_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2 text-slate-600">
                              <span className="flex items-center gap-1"><FiLayers className="text-[10px] text-slate-400" /> {row.class_name}</span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="flex items-center gap-1 text-slate-800 font-semibold"><FiBook className="text-[10px] text-slate-400" /> {row.subject_name}</span>
                              <span className="font-mono text-[10px] text-slate-400">{row.subject_code}</span>
                            </td>
                            <td className="px-4 py-2 text-slate-600">
                              <span className="flex items-center gap-1"><FiClock className="text-[10px] text-slate-400" /> {row.start_time} – {row.end_time}</span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">
                                <FiMapPin className="text-[9px]" /> {row.room_number || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherExamsPage;

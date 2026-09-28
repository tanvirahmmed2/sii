'use client';

import React, { useEffect, useState } from 'react';
import { FiCalendar, FiClock, FiMapPin, FiInfo, FiAward } from 'react-icons/fi';

const ExamsPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch('/api/student/exams');
        if (res.ok) {
          const data = await res.json();
          setSchedules(data.paylod?.examSchedules || data.examSchedules || []);
        }
      } catch (error) {
        console.error('Error fetching exam schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading exam schedule...</p>
      </div>
    );
  }

  // Group schedules by exam name
  const examsMap = {};
  schedules.forEach((item) => {
    const key = `${item.exam_name} (${item.exam_term})`;
    if (!examsMap[key]) {
      examsMap[key] = {
        name: item.exam_name,
        term: item.exam_term,
        status: item.exam_status,
        schedules: []
      };
    }
    examsMap[key].schedules.push(item);
  });

  const examGroups = Object.values(examsMap);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiAward /> Examination Hub
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Exam Routine & Timetable</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Check subject dates, room seating arrangements, and schedule timelines for all exam terms.
          </p>
        </div>
      </div>

      {examGroups.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Exams Scheduled</h3>
          <p className="text-slate-400 text-xs max-w-xs">There are no upcoming exam routines published for your class right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {examGroups.map((group, idx) => (
            <div key={idx} className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{group.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="text-xs font-semibold text-slate-500">
                      Term: <strong className="text-slate-700">{group.term}</strong>
                    </span>
                    {group.schedules[0]?.exam_fee !== undefined && parseFloat(group.schedules[0].exam_fee) > 0 && (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-xs">
                        Exam Fee: {parseFloat(group.schedules[0].exam_fee).toFixed(2)} BDT
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${
                  group.status === 'Active' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                }`}>
                  {group.status || 'Active'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Timing</th>
                      <th className="py-3 px-4">Hall / Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {group.schedules.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {new Date(row.exam_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{row.subject_name}</p>
                          {row.subject_code && (
                            <span className="text-[10px] text-slate-400 font-mono">Code: {row.subject_code}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <FiClock className="text-slate-400" /> {row.start_time} - {row.end_time}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100">
                            <FiMapPin className="text-emerald-500" /> Room {row.room_number || 'TBA'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamsPage;

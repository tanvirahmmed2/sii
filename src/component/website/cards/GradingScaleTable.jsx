'use client';

import React, { useEffect, useState } from 'react';
import { FiAward, FiInfo } from 'react-icons/fi';

const GradingScaleTable = ({ title = "Institutional Grading Scale", subtitle = "Official breakdown of letter grades, mark range thresholds, and grade points." }) => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await fetch('/api/grades');
        if (response.ok) {
          const data = await response.json();
          setGrades(data.paylod?.grades || []);
        }
      } catch (error) {
        console.error('Failed to load grades scale:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <FiAward className="text-secondary" /> {title}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 border border-slate-100 shrink-0">
          <FiInfo className="text-secondary text-sm" />
          <span>{grades.length} Grade Standard{grades.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-slate-400">Loading grading system...</span>
        </div>
      ) : grades.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No grade scale standard configured.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Letter Grade
                </th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Min Mark (%)
                </th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Max Mark (%)
                </th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Grade Point
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((grade) => (
                <tr key={grade.grade_id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      
                      <span className="text-sm font-bold text-slate-800">
                        {grade.letter_grade}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                    {parseFloat(grade.min_mark).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                    {parseFloat(grade.max_mark).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-extrabold bg-primary-light text-secondary border border-primary-light">
                      {grade.point !== undefined && grade.point !== null ? parseFloat(grade.point).toFixed(2) : '0.00'}
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
};

export default GradingScaleTable;

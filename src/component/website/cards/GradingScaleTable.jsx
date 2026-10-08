'use client';

import React, { useEffect, useState, useContext } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const GradingScaleTable = ({
  title = 'Institutional Grading Scale',
  subtitle = 'Official breakdown of letter grades, mark range thresholds, and grade points.',
}) => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await fetch(getApiEndpoint('grades'));
        if (response.ok) {
          const data = await response.json();
          setGrades(data.payload?.grades || data.paylod?.grades || []);
        }
      } catch (error) {
        console.error('Failed to load grades scale:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [getApiEndpoint]);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
          {grades.length} Grade Standard{grades.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Loading grading system...
        </div>
      ) : grades.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No grade scale standards configured.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">
                <th className="px-4 py-2.5">Letter Grade</th>
                <th className="px-4 py-2.5">Grade Point (GPA)</th>
                <th className="px-4 py-2.5">Mark Range (%)</th>
                <th className="px-4 py-2.5">Academic Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
              {grades.map((grade) => (
                <tr key={grade.id || grade.grade_name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white font-mono">
                    {grade.grade_name || grade.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono">
                    {parseFloat(grade.grade_point || grade.point || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                    {grade.min_mark}% &ndash; {grade.max_mark}%
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                      {grade.comment || grade.remarks || 'Standard'}
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

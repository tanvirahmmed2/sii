'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { FiArrowLeft, FiPrinter, FiAward, FiCheckCircle, FiXCircle, FiTrendingUp, FiSliders, FiFilter, FiDownload } from 'react-icons/fi';
import { SCHOOL_NAME } from '@/lib/secret';

const MasterMarkSheetContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const examId = searchParams.get('exam_id');
  const classId = searchParams.get('class_id');
  const sectionId = searchParams.get('section_id') || 'all';

  const [sortBy, setSortBy] = useState('gpa'); // 'gpa' or 'total'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatrix = async () => {
    if (!examId || !classId) {
      setError('Invalid request parameters. Please select an exam and class.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/students/marks?exam_id=${examId}&class_id=${classId}&section_id=${sectionId}&mode=matrix&sort_by=${sortBy}`);
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData.paylod);
      } else {
        setError(resData.error || 'Failed to retrieve master mark sheet data.');
      }
    } catch (err) {
      setError('An error occurred while fetching the mark sheet matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [examId, classId, sectionId, sortBy]);

  const handleDownloadExcel = () => {
    if (!data || !data.students || data.students.length === 0) return;
    const { exam, subjects, students } = data;
    const schoolName = SCHOOL_NAME || 'Star Cadet Academia';

    const headerRow1 = [schoolName.toUpperCase()];
    const headerRow2 = [`MASTER EXAMINATION MARK SHEET - ${exam?.name?.toUpperCase() || ''}`];
    const headerRow3 = [
      `Class: ${exam?.class_name || ''}`,
      `Term: ${exam?.term || 'N/A'}`,
      `Section: ${sectionId !== 'all' ? sectionId : 'All'}`,
      `Date: ${new Date().toLocaleDateString()}`
    ];
    const headerRow4 = [];

    const tableHeaders = [
      '#',
      'Rank',
      'Roll',
      'Registration No',
      'Student Name',
      ...subjects.map(sub => `${sub.name}${sub.code ? ` (${sub.code})` : ''}`),
      'Total Obtained',
      'Total Max',
      'Average GPA',
      'Overall Grade',
      'Status'
    ];

    const tableData = students.map((st, idx) => {
      const row = [
        idx + 1,
        st.status === 'Pass' && st.overall_grade !== 'F' && st.merit_rank ? st.merit_rank : '-',
        st.roll || 'N/A',
        st.registration_number || '',
        st.name || '',
      ];

      subjects.forEach(sub => {
        const m = st.subject_marks[sub.id];
        if (m) {
          row.push(`${m.obtained} (${m.letter})`);
        } else {
          row.push('-');
        }
      });

      row.push(st.total_obtained, st.total_max, st.gpa.toFixed(2), st.overall_grade, st.status);
      return row;
    });

    const sheetData = [
      headerRow1,
      headerRow2,
      headerRow3,
      headerRow4,
      tableHeaders,
      ...tableData
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Mark Sheet');

    const fileName = `Master_Mark_Sheet_${(exam?.class_name || 'Class').replace(/\s+/g, '_')}_${(exam?.name || 'Exam').replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200/60 border-t-primary rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-500">Compiling Master Examination Mark Sheet...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-md mx-auto my-16 p-8 bg-red-50 border border-red-100 rounded-3xl text-center flex flex-col items-center gap-4">
        <FiXCircle className="text-red-500 text-4xl" />
        <div>
          <h2 className="text-base font-bold text-red-800">Preview Error</h2>
          <p className="text-xs text-red-600 mt-1">{error || 'Mark sheet data unavailable.'}</p>
        </div>
        <Link
          href="/admin/students/marks"
          className="px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
        >
          &larr; Return to Marks Entry
        </Link>
      </div>
    );
  }

  const { exam, subjects, students } = data;
  const schoolName = SCHOOL_NAME || 'Star Cadet Academia';

  const getGradePill = (grade, status) => {
    const isFail = status === 'Fail' || grade === 'F';
    if (isFail) {
      return <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-100">F</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">{grade}</span>;
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students/marks"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all border border-slate-100 shrink-0"
            title="Back to Marks Entry"
          >
            <FiArrowLeft className="text-lg" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiAward className="text-primary" /> {exam?.name || 'Master Examination Mark Sheet'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Class: <strong>{exam?.class_name}</strong> {sectionId !== 'all' ? `(Section ${sectionId})` : ''} &bull; Total Students: <strong>{students.length}</strong>
            </p>
          </div>
        </div>

        {/* Controls: Sorting + Print */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 flex items-center gap-1">
              <FiSliders /> Sort By:
            </span>
            <button
              onClick={() => setSortBy('gpa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'gpa'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grade Point (GPA)
            </button>
            <button
              onClick={() => setSortBy('total')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'total'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total Number
            </button>
          </div>

          <button
            onClick={handleDownloadExcel}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <FiDownload className="text-sm" /> Download Excel Sheet (.xlsx)
          </button>

          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <FiPrinter className="text-sm" /> Print Mark Sheet
          </button>
        </div>
      </div>

      {/* Broadsheet Container */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden print:p-0 print:border-none print:shadow-none">
        
        {/* Printable Header */}
        <div className="text-center mb-6 border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-wider">{schoolName}</h2>
          <h3 className="text-base font-bold text-primary mt-1">
            MASTER EXAMINATION MARK SHEET &ndash; {exam?.name?.toUpperCase()}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Academic Class: <strong>{exam?.class_name}</strong> {exam?.term ? `(${exam.term})` : ''} &bull; Sorted By: <strong>{sortBy === 'gpa' ? 'Grade Point Average (GPA)' : 'Total Marks Obtained'}</strong>
          </p>
        </div>

        {students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">
            No registered students found for this examination and class selection.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200 w-10">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200 w-12 text-indigo-700">Rank</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200 w-12">Roll</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-r border-slate-200">Student Name</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider border-r border-slate-200">Reg No</th>
                  
                  {/* Subject Columns */}
                  {subjects.map((sub) => (
                    <th key={sub.id} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center border-r border-slate-200 min-w-[90px]">
                      <div>{sub.name}</div>
                      {sub.code && <span className="text-[9px] font-medium text-slate-500">({sub.code})</span>}
                    </th>
                  ))}

                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-right border-r border-slate-200">Total</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200">GPA</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200">Grade</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-semibold text-slate-800">
                {students.map((st, idx) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3 text-center text-slate-400 border-r border-slate-200 font-bold">{idx + 1}</td>
                    <td className="px-3 py-3 text-center border-r border-slate-200 font-extrabold text-indigo-600">
                      {st.status === 'Pass' && st.overall_grade !== 'F' && st.merit_rank ? st.merit_rank : '-'}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-200 font-bold">{st.roll || 'N/A'}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">{st.name}</td>
                    <td className="px-3 py-3 text-slate-500 border-r border-slate-200 font-bold whitespace-nowrap">{st.registration_number}</td>

                    {/* Per Subject Marks */}
                    {subjects.map((sub) => {
                      const m = st.subject_marks[sub.id];
                      return (
                        <td key={sub.id} className="px-3 py-3 text-center border-r border-slate-200 whitespace-nowrap">
                          {m ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-900">{m.obtained}</span>
                              <span className={`text-[10px] font-extrabold ${m.letter === 'F' ? 'text-rose-600' : 'text-emerald-700'}`}>
                                ({m.letter})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-3 text-right font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {st.total_obtained} <span className="text-[10px] text-slate-400">/ {st.total_max}</span>
                    </td>
                    <td className="px-3 py-3 text-center font-extrabold text-primary border-r border-slate-200">
                      {st.gpa.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center border-r border-slate-200">
                      {getGradePill(st.overall_grade, st.status)}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {st.status === 'Pass' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          <FiCheckCircle className="text-xs" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                          <FiXCircle className="text-xs" /> Fail
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Generated on: {new Date().toLocaleString()}</span>
          <span>Official Examination Broadsheet &bull; {schoolName}</span>
        </div>
      </div>
    </div>
  );
};

export default function MasterMarkSheetPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MasterMarkSheetContent />
    </Suspense>
  );
}

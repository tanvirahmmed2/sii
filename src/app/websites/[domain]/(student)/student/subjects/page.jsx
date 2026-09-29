'use client';

import React, { useEffect, useState } from 'react';
import { FiBook, FiUser, FiDownload, FiInfo, FiFileText, FiCheckSquare, FiMail } from 'react-icons/fi';
import Link from 'next/link';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch('/api/student/subjects');
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.paylod?.subjects || []);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading your subjects...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiBook /> Course Overview
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Subjects & Syllabus</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Review registered subjects, access official course syllabuses, and connect with teachers.
          </p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-semibold w-fit">
          Enrolled: {subjects.length} Subjects
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Subjects Registered</h3>
          <p className="text-slate-400 text-xs max-w-xs">There are no subjects assigned to your current class level.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/70 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                    <FiBook className="text-xl" />
                  </div>
                  {sub.subject_code && (
                    <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {sub.subject_code}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-1">{sub.subject_name}</h3>
                {sub.description && (
                  <p className="text-slate-400 text-xs line-clamp-2 mb-3">{sub.description}</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100/60 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {sub.teacher_name ? sub.teacher_name.charAt(0).toUpperCase() : <FiUser />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-xs truncate">
                      {sub.teacher_name || 'Teacher not assigned'}
                    </p>
                    {sub.teacher_email && (
                      <p className="text-slate-400 text-[10px] truncate flex items-center gap-1">
                        <FiMail className="text-[9px]" /> {sub.teacher_email}
                      </p>
                    )}
                  </div>
                </div>

                {sub.syllabus_link ? (
                  <a
                    href={sub.syllabus_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FiDownload className="text-sm" />
                    <span>Download Syllabus ({sub.syllabus_title || 'PDF'})</span>
                  </a>
                ) : (
                  <div className="py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl text-xs font-medium text-center">
                    No syllabus uploaded
                  </div>
                )}
                
                <div className="flex justify-center">
                  <Link
                    href={`/student/materials?class_subject_id=${sub.class_subject_id}&subject_name=${encodeURIComponent(sub.subject_name)}`}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl text-xs font-medium transition-colors text-center"
                  >
                    <FiFileText className="text-xs text-blue-500" />
                    <span>View Study Materials</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;

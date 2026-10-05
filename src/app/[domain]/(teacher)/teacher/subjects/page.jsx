'use client';

import React, { useEffect, useState } from 'react';
import { FiBook, FiLayers } from 'react-icons/fi';
import Link from 'next/link';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch('/api/teacher/subjects');
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.paylod.subjects || []);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FiBook className="text-primary" /> My Subjects
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Subjects you are assigned to teach across class sections.</p>
      </div>

      {loading ? (
        <div className="w-full py-10 text-center text-xs text-slate-400">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-xs text-slate-400">
          No subjects assigned yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Subject Name</th>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Class</th>
                <th className="px-4 py-2.5">Section</th>
                <th className="px-4 py-2.5">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((sub, idx) => (
                <tr key={sub.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-400 font-medium">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{sub.subject_name}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{sub.subject_code}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <span className="flex items-center gap-1"><FiLayers className="text-slate-400 text-[10px]" /> Class {sub.class_name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{sub.section_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <Link href={`/teacher/lessons?class_subject_id=${sub.id}&subject_name=${encodeURIComponent(sub.subject_name)}`}
                        className="px-2 py-0.5 bg-primary/5 text-primary rounded text-[10px] font-semibold hover:bg-primary/10">Lessons</Link>
                      <Link href={`/teacher/materials?class_subject_id=${sub.id}&subject_name=${encodeURIComponent(sub.subject_name)}`}
                        className="px-2 py-0.5 bg-primary/5 text-primary rounded text-[10px] font-semibold hover:bg-primary/10">Materials</Link>
                    </div>
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

export default SubjectsPage;

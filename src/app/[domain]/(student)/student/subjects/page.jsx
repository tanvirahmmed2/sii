'use client';

import React, { useEffect, useState, useMemo } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const SubjectsPage = () => {
  const { getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/subjects'));
        if (res.ok) {
          const data = await res.json();
          const list = data.payload?.subjects || data.paylod?.subjects || data.subjects || [];
          setSubjects(list);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [getApiEndpoint]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      const match = searchTerm === '' ||
        (sub.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.subject_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return match;
    });
  }, [subjects, searchTerm]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Academic Curriculum &amp; Syllabus
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Enrolled Subjects &amp; Syllabus
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review curriculum subjects, download course syllabi, verify pass marks, and access LMS study materials.
          </p>
        </div>

        {/* View Switcher & Counter */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md flex items-center gap-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cards View
            </button>
          </div>

          <div className="px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-primary text-xs font-semibold">
            {subjects.length} Subjects
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
        <input
          type="text"
          placeholder="Search subjects by name, code, or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-primary"
        />
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-1.5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">No Matching Subjects Found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto">
            {searchTerm ? `No subjects match "${searchTerm}"` : 'There are no subjects assigned to your current class level.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Subject Name</th>
                  <th className="py-2.5 px-3">Instructor</th>
                  <th className="py-2.5 px-3 text-center">Full Marks</th>
                  <th className="py-2.5 px-3 text-center">Pass Marks</th>
                  <th className="py-2.5 px-3 text-center">Official Syllabus</th>
                  <th className="py-2.5 px-3 text-right">LMS Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredSubjects.map((sub, idx) => (
                  <tr key={sub.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {sub.subject_code || `SUB-${idx + 1}`}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{sub.subject_name}</p>
                      {sub.description && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{sub.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {sub.teacher_name || 'Faculty Assigned'}
                      </p>
                      {sub.teacher_email && (
                        <p className="text-slate-400 text-[10px] truncate">{sub.teacher_email}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                      {sub.full_marks || 100}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                      {sub.pass_marks || 33}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {sub.syllabus_link ? (
                        <a
                          href={sub.syllabus_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-[11px] font-medium transition-colors inline-block"
                        >
                          Syllabus PDF
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pending Upload</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={tenantUrl(`/student/materials?class_subject_id=${sub.class_subject_id || sub.id}&subject_name=${encodeURIComponent(sub.subject_name)}`)}
                        className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors inline-block"
                      >
                        Study Resources →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub, idx) => (
            <div
              key={sub.id || idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    Subject Record
                  </span>
                  {sub.subject_code && (
                    <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {sub.subject_code}
                    </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{sub.subject_name}</h3>
                {sub.description && (
                  <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">{sub.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span>Full: <strong className="font-medium text-slate-800 dark:text-slate-200 font-mono">{sub.full_marks || 100}</strong></span>
                  <span>•</span>
                  <span>Pass: <strong className="font-medium text-slate-800 dark:text-slate-200 font-mono">{sub.pass_marks || 33}</strong></span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Instructor:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{sub.teacher_name || 'Assigned Faculty'}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {sub.syllabus_link ? (
                    <a
                      href={sub.syllabus_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Syllabus PDF
                    </a>
                  ) : null}
                  <Link
                    href={tenantUrl(`/student/materials?class_subject_id=${sub.class_subject_id || sub.id}&subject_name=${encodeURIComponent(sub.subject_name)}`)}
                    className="flex-1 text-center py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors shadow-xs"
                  >
                    Study Materials →
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

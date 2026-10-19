'use client';

import React, { useEffect, useState, useMemo } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { 
  FiBook, FiUser, FiDownload, FiInfo, FiFileText, 
  FiSearch, FiGrid, FiList, FiMail, FiCheckCircle 
} from 'react-icons/fi';
import Link from 'next/link';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch('/api/student/subjects');
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
  }, []);

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
    <div className="flex flex-col gap-6 w-full pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiBook /> Academic Curriculum & Syllabus
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Enrolled Subjects & Syllabus</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Review curriculum subjects, download course syllabi, verify pass marks, and access subject LMS study materials.
          </p>
        </div>

        {/* View Switcher & Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <FiList className="text-sm" /> <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <FiGrid className="text-sm" /> <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-bold">
            {subjects.length} Subjects Enrolled
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <FiSearch className="text-slate-400 text-base" />
        <input
          type="text"
          placeholder="Search subjects by name, subject code, or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiInfo className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Matching Subjects Found</h3>
          <p className="text-slate-400 text-xs max-w-xs">
            {searchTerm ? `No subjects match "${searchTerm}"` : 'There are no subjects assigned to your current class level.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Class Subjects Registry Table</h2>
              <p className="text-xs text-slate-400 font-medium">Curriculum subjects mapped to your academic program</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Showing {filteredSubjects.length} of {subjects.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Assigned Instructor</th>
                  <th className="py-3 px-4 text-center">Full Marks</th>
                  <th className="py-3 px-4 text-center">Pass Marks</th>
                  <th className="py-3 px-4 text-center">Official Syllabus</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">LMS Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSubjects.map((sub, idx) => (
                  <tr key={sub.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-600">
                      {sub.subject_code || `SUB-${idx + 1}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{sub.subject_name}</p>
                      {sub.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{sub.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {sub.teacher_name ? sub.teacher_name.charAt(0).toUpperCase() : <FiUser />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-xs truncate">
                            {sub.teacher_name || 'Faculty Assigned'}
                          </p>
                          {sub.teacher_email && (
                            <p className="text-slate-400 text-[10px] truncate">{sub.teacher_email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {sub.full_marks || 100}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                      {sub.pass_marks || 40}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {sub.syllabus_link ? (
                        <a
                          href={sub.syllabus_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-bold transition-colors"
                        >
                          <FiDownload className="text-xs" /> Syllabus PDF
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pending Upload</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/student/materials?class_subject_id=${sub.class_subject_id || sub.id}&subject_name=${encodeURIComponent(sub.subject_name)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <FiFileText className="text-xs text-emerald-600" /> Study Resources
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub, idx) => (
            <div
              key={sub.id || idx}
              className="bg-white border border-slate-200/70 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                    <FiBook className="text-xl" />
                  </div>
                  {sub.subject_code && (
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                      {sub.subject_code}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-1">{sub.subject_name}</h3>
                {sub.description && (
                  <p className="text-slate-400 text-xs line-clamp-2 mb-3">{sub.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 my-3">
                  <span>Full Marks: <strong className="text-slate-800">{sub.full_marks || 100}</strong></span>
                  <span>&bull;</span>
                  <span>Pass Marks: <strong className="text-slate-800">{sub.pass_marks || 40}</strong></span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100/60 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {sub.teacher_name ? sub.teacher_name.charAt(0).toUpperCase() : <FiUser />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-xs truncate">
                      {sub.teacher_name || 'Faculty not assigned'}
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
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FiDownload className="text-sm" />
                    <span>Download Syllabus PDF</span>
                  </a>
                ) : (
                  <div className="py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl text-xs font-medium text-center">
                    No syllabus uploaded
                  </div>
                )}
                
                <Link
                  href={`/student/materials?class_subject_id=${sub.class_subject_id || sub.id}&subject_name=${encodeURIComponent(sub.subject_name)}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl text-xs font-semibold transition-colors text-center"
                >
                  <FiFileText className="text-xs text-blue-500" />
                  <span>View Study Materials</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;

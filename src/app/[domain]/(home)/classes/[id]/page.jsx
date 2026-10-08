'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TeacherCard from 'src/component/website/cards/TeacherCard';
import SubjectCard from 'src/component/website/cards/SubjectCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ClassDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);

  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          classesRes,
          teachersRes,
          classSubjectsRes,
          classSubjectTeachersRes
        ] = await Promise.all([
          fetch(getApiEndpoint('classes')).catch(() => null),
          fetch(getApiEndpoint('teachers')).catch(() => null),
          fetch(getApiEndpoint('class-subjects')).catch(() => null),
          fetch(getApiEndpoint('class-subject-teachers')).catch(() => null)
        ]);

        let resolvedClass = null;

        if (classesRes && classesRes.ok) {
          const classesData = await classesRes.json();
          const list = classesData.paylod?.classes || classesData.payload?.classes || [];
          const found = list.find(
            (c) => String(c.code).toLowerCase() === String(id).toLowerCase() || String(c.id) === String(id)
          );
          setSelectedClass(found || null);
          resolvedClass = found;
        }

        if (resolvedClass) {
          if (classSubjectsRes && classSubjectsRes.ok) {
            const assignmentsData = await classSubjectsRes.json();
            const list = assignmentsData.paylod?.assignments || assignmentsData.payload?.assignments || [];
            const uniqueSubjects = [];
            const seenSubjectIds = new Set();
            list.forEach(a => {
              if (String(a.class_id) === String(resolvedClass.id) && !seenSubjectIds.has(a.subject_id)) {
                seenSubjectIds.add(a.subject_id);
                uniqueSubjects.push({
                  id: a.subject_id,
                  name: a.subject_name,
                  code: a.subject_code
                });
              }
            });
            setClassSubjects(uniqueSubjects);
          }

          const assignedTeacherIds = new Set();
          if (classSubjectTeachersRes && classSubjectTeachersRes.ok) {
            const cstData = await classSubjectTeachersRes.json();
            const cstList = cstData.paylod?.assignments || cstData.payload?.assignments || [];
            cstList.forEach(a => {
              if (String(a.class_id) === String(resolvedClass.id)) {
                assignedTeacherIds.add(String(a.teacher_id));
              }
            });
          }

          if (teachersRes && teachersRes.ok) {
            const teachersData = await teachersRes.json();
            const allTeachers = teachersData.paylod?.teachers || teachersData.payload?.teachers || [];
            const filteredTeachers = allTeachers.filter(t => assignedTeacherIds.has(String(t.id)));
            setTeachers(filteredTeachers);
          }
        }
      } catch (err) {
        console.error('Error fetching class data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(tenantUrl('/classes'))}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            ← Back to All Classes
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Class Curriculum
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 space-y-2">
              <div className="w-48 h-5 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-full h-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
          </div>
        ) : selectedClass ? (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Code: {selectedClass.code || selectedClass.id}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {selectedClass.name}
              </h1>
              {selectedClass.description && (
                <div
                  className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800"
                  dangerouslySetInnerHTML={{ __html: selectedClass.description }}
                />
              )}
            </div>

            {/* Subjects Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Configured Subjects ({classSubjects.length})
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Curriculum Syllabus</span>
              </div>

              {classSubjects.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No academic subjects mapped to this class level yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classSubjects.map((sub) => (
                    <SubjectCard key={sub.id} subject={sub} />
                  ))}
                </div>
              )}
            </div>

            {/* Teachers Assigned */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Instructional Faculty ({teachers.length})
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Assigned Teachers</span>
              </div>

              {teachers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No faculty members are explicitly linked to this class curriculum.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {teachers.map((t) => (
                    <TeacherCard key={t.id} teacher={t} />
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Class Record Not Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The class identifier &ldquo;{id}&rdquo; does not match any active curriculum on {website?.name || 'our platform'}.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClassDetailsPage;

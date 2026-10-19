'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
          fetch(getApiEndpoint('home/classes')).catch(() => null),
          fetch(getApiEndpoint('home/teachers')).catch(() => null),
          fetch(getApiEndpoint('home/class-subjects')).catch(() => null),
          fetch(getApiEndpoint('home/class-subject-teachers')).catch(() => null)
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">

        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4"
        >
          <button
            onClick={() => router.push(tenantUrl('/classes'))}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            ← Back to All Classes
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            Class Curriculum
          </span>
        </motion.div>

        {loading ? (
          <div className="space-y-6">
            <div className="w-full h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 space-y-3 shadow-xs">
              <div className="w-48 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="w-full h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
            </div>
          </div>
        ) : selectedClass ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            
            {/* Header Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Code: {selectedClass.code || selectedClass.id}
                  </span>
                </div>
                {selectedClass.expected_cost && parseFloat(selectedClass.expected_cost) > 0 && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                    <span>Expected Commitment:</span>
                    <span className="font-bold">
                      ৳{parseFloat(selectedClass.expected_cost).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">/ academic year</span>
                  </div>
                )}
              </div>

              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
                  {selectedClass.name}
                </h1>
                {selectedClass.motto && (
                  <p className="text-sm italic font-medium text-primary mt-1">
                    &ldquo;{selectedClass.motto}&rdquo;
                  </p>
                )}
              </div>

              {selectedClass.summary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Overview Synopsis
                  </span>
                  {selectedClass.summary}
                </div>
              )}

              {selectedClass.description && (
                <div
                  className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-4 border-t border-slate-100 dark:border-slate-800/80"
                  dangerouslySetInnerHTML={{ __html: selectedClass.description }}
                />
              )}
            </div>

            {/* Subjects Roster */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
                  Configured Subjects ({classSubjects.length})
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Curriculum Syllabus</span>
              </div>

              {classSubjects.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 shadow-xs">
                  No academic subjects mapped to this class level yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classSubjects.map((sub) => (
                    <SubjectCard key={sub.id} subject={sub} />
                  ))}
                </div>
              )}
            </div>

            {/* Teachers Assigned */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
                  Instructional Faculty ({teachers.length})
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Assigned Teachers</span>
              </div>

              {teachers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 shadow-xs">
                  No faculty members are explicitly linked to this class curriculum.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {teachers.map((t) => (
                    <TeacherCard key={t.id} teacher={t} />
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3 shadow-xs">
            <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">Class Record Not Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              The class identifier &ldquo;{id}&rdquo; does not match any active curriculum on {website?.name || 'our platform'}.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClassDetailsPage;

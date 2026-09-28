'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiBook,
  FiArrowLeft,
  FiUser,
  FiInfo,
  FiBookOpen
} from 'react-icons/fi';
import TeacherCard from '@/component/cards/TeacherCard';
import SubjectCard from '@/component/cards/SubjectCard';

const ClassDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

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
          fetch('/api/classes').catch(() => null),
          fetch('/api/teachers').catch(() => null),
          fetch('/api/class-subjects').catch(() => null),
          fetch('/api/class-subject-teachers').catch(() => null)
        ]);

        let resolvedClass = null;

        if (classesRes && classesRes.ok) {
          const classesData = await classesRes.json();
          const list = classesData.paylod?.classes || [];
          const found = list.find(
            (c) => String(c.code).toLowerCase() === String(id).toLowerCase() || String(c.id) === String(id)
          );
          setSelectedClass(found || null);
          resolvedClass = found;
        }

        if (resolvedClass) {
          // Filter unique subjects mapped to this class
          if (classSubjectsRes && classSubjectsRes.ok) {
            const assignmentsData = await classSubjectsRes.json();
            const list = assignmentsData.paylod?.assignments || [];
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

          // Gather all teacher IDs assigned to this class from class-subject-teachers
          const assignedTeacherIds = new Set();

          if (classSubjectTeachersRes && classSubjectTeachersRes.ok) {
            const cstData = await classSubjectTeachersRes.json();
            const cstList = cstData.paylod?.assignments || [];
            cstList.forEach(a => {
              if (String(a.class_id) === String(resolvedClass.id)) {
                assignedTeacherIds.add(String(a.teacher_id));
              }
            });
          }

          // Filter full teacher details
          if (teachersRes && teachersRes.ok) {
            const teachersData = await teachersRes.json();
            const allTeachers = teachersData.paylod?.teachers || [];
            const filteredTeachers = allTeachers.filter(t => assignedTeacherIds.has(String(t.id)));
            setTeachers(filteredTeachers);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex flex-col gap-8">

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/classes')}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FiArrowLeft />
            <span>Back to All Classes</span>
          </button>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100/80 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Academic portal
          </span>
        </div>

        {loading ? (
          <div className="w-full flex flex-col gap-6 animate-pulse">
            <div className="w-full h-48 bg-slate-200 rounded-3xl"></div>
            <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col gap-4">
              <div className="w-48 h-6 bg-slate-200 rounded"></div>
              <div className="w-full h-32 bg-slate-200 rounded"></div>
            </div>
          </div>
        ) : selectedClass ? (
          <div className="flex flex-col gap-10">
            <div className="w-full h-50 bg-primary flex items-center justify-center text-white rounded-xl">

              
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
                {selectedClass.name}
              </h1>

            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.01)] flex flex-col gap-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
                <FiBookOpen className="text-primary text-xl" /> Course Objectives & Information
              </h2>
              <div className="text-sm text-slate-600 leading-relaxed font-semibold">
                {selectedClass.description ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-650"
                    dangerouslySetInnerHTML={{ __html: selectedClass.description }}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    <p>
                      This class follows the Fontana Institute of Technology core academic training structures. It covers the complete set of primary curriculum guidelines, periodic test series, practical assignments, and midterm exams specified by the Academic Council.
                    </p>
                    <p>
                      Students registered in this class can download syllabus PDF attachments, inspect classroom timetables, and monitor daily attendance logs by logging directly into their secure Student Portal account.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FiBook className="text-slate-400" /> Academic Subjects ({classSubjects.length})
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Configured subjects for this class</span>
              </div>

              {classSubjects.length === 0 ? (
                <div className="w-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs">
                  <FiInfo /> No subjects mapped to this class yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {classSubjects.map((sub) => (
                    <SubjectCard
                      key={sub.id}
                      subject={sub}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FiUser className="text-slate-400" /> Dedicated Faculty Members ({teachers.length})
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Assigned professors & lecturers</span>
              </div>

              {teachers.length === 0 ? (
                <div className="w-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs">
                  <FiInfo /> No registered academic faculty members found in the records.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {teachers.map((t) => (
                    <TeacherCard key={t.id} teacher={t} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center max-w-md mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiBook />
            </div>
            <h3 className=" text-slate-850 text-base font-semibold">Class not found</h3>
            <p className="text-slate-500 text-xs mt-1.5">
              The requested class code "{id}" does not match any registered records in our academic database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassDetailsPage;

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiSave, FiRefreshCw, FiCalendar, FiFilter, FiBookOpen, FiAward, FiEye } from 'react-icons/fi';

const StudentMarksPage = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Selected filters
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Roster sheet
  const [marksList, setMarksList] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [examsRes, classesRes, sectionsRes, subjectsRes] = await Promise.all([
        axios.get('/api/exams'),
        axios.get('/api/classes'),
        axios.get('/api/sections'),
        axios.get('/api/subjects')
      ]);
      setExams(examsRes.data.paylod?.exams || examsRes.data.exams || []);
      setClasses(classesRes.data.paylod?.classes || classesRes.data.classes || []);
      setSections(sectionsRes.data.paylod?.sections || sectionsRes.data.sections || []);
      setSubjects(subjectsRes.data.paylod?.subjects || subjectsRes.data.subjects || []);
    } catch (error) {
      toast.error('Failed to load filter metadata.');
    }
  };

  const filteredSections = sections.filter(
    (s) => s.class_id === parseInt(selectedClass, 10)
  );

  const handleLoadMarksSheet = async () => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      toast.error('Please select Exam, Class, and Subject.');
      return;
    }

    setLoadingMarks(true);
    try {
      const response = await axios.get(
        `/api/students/marks?exam_id=${selectedExam}&class_id=${selectedClass}&subject_id=${selectedSubject}&section_id=${selectedSection || 'all'}`
      );
      
      const initialMarks = (response.data.paylod?.students || response.data.students || []).map(student => ({
        student_id: student.student_id,
        name: student.name,
        registration_number: student.registration_number,
        marks_obtained: student.marks_obtained !== null ? student.marks_obtained : '',
        total_marks: student.total_marks !== null ? student.total_marks : 100.00,
        remarks: student.remarks || ''
      }));

      setMarksList(initialMarks);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoadingMarks(false);
    }
  };

  const handleMarkChange = (studentId, field, value) => {
    setMarksList(prev => prev.map(item => {
      if (item.student_id === studentId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveMarks = async (e) => {
    e.preventDefault();
    if (marksList.length === 0) return;

    setSavingMarks(true);
    try {
      const payload = marksList.map(item => ({
        student_id: item.student_id,
        exam_id: parseInt(selectedExam, 10),
        subject_id: parseInt(selectedSubject, 10),
        marks_obtained: item.marks_obtained === '' ? 0.00 : parseFloat(item.marks_obtained),
        total_marks: parseFloat(item.total_marks),
        remarks: item.remarks
      }));

      const response = await axios.post('/api/students/marks', { marks: payload });
      toast.success(response.data.message || 'Marks saved successfully!');
      handleLoadMarksSheet();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSavingMarks(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiAward className="text-primary" /> Enter Student Marks
        </h1>
        <p className="text-sm text-slate-500">
          Select exam and class filters to enter and register subject scores.
        </p>
      </div>

      {/* Filters form */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiCalendar /> Select Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary bg-slate-50"
            >
              <option value="">-- Choose Exam --</option>
              {exams.map(e => (
                <option key={e.id || e.exam_id} value={e.id || e.exam_id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiFilter /> Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary bg-slate-50"
            >
              <option value="">-- Choose Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiFilter /> Section (Optional)
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary disabled:opacity-50 bg-slate-50"
            >
              <option value="">All Sections</option>
              {filteredSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiBookOpen /> Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary bg-slate-50"
            >
              <option value="">-- Choose Subject --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
          {selectedExam && selectedClass && (
            <Link
              href={`/admin/students/marks/preview?exam_id=${selectedExam}&class_id=${selectedClass}&section_id=${selectedSection || 'all'}`}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <FiEye className="text-sm" /> Preview Master Mark Sheet
            </Link>
          )}
          <button
            onClick={handleLoadMarksSheet}
            disabled={loadingMarks}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform duration-150 cursor-pointer disabled:opacity-50"
          >
            {loadingMarks ? (
              <FiRefreshCw className="animate-spin text-sm" />
            ) : (
              <FiRefreshCw className="text-sm" />
            )}
            Load Students Sheet
          </button>
        </div>
      </div>

      {/* Marks sheet entries table */}
      {marksList.length > 0 && (
        <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <form onSubmit={handleSaveMarks}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Grade Sheet ({marksList.length} Students)
              </h2>
              <span className="text-[11px] bg-emerald-50 text-primary font-bold px-2 py-0.5 rounded-full">
                Marks Entry Form
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reg. ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40">Marks Obtained</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40">Total Marks</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marksList.map((item) => (
                    <tr key={item.student_id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-xs font-bold text-slate-500">{item.registration_number}</td>
                      <td className="px-6 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.total_marks}
                          required
                          value={item.marks_obtained}
                          onChange={(e) => handleMarkChange(item.student_id, 'marks_obtained', e.target.value)}
                          className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-6 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={item.total_marks}
                          onChange={(e) => handleMarkChange(item.student_id, 'total_marks', e.target.value)}
                          className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-6 py-2">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleMarkChange(item.student_id, 'remarks', e.target.value)}
                          className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingMarks}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {savingMarks ? (
                  <>
                    <FiSave className="animate-spin text-sm" /> Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="text-sm" /> Save Grade Sheet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentMarksPage;

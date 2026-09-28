'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiEye, FiPrinter, FiCalendar, FiFilter, FiUser, FiFileText } from 'react-icons/fi';

const StudentTranscriptsPage = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);

  // Selected filters
  const [transExam, setTransExam] = useState('');
  const [transClass, setTransClass] = useState('');
  const [transSection, setTransSection] = useState('');
  const [transStudent, setTransStudent] = useState('');
  
  const [transcriptData, setTranscriptData] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [examsRes, classesRes, sectionsRes] = await Promise.all([
        axios.get('/api/exams'),
        axios.get('/api/classes'),
        axios.get('/api/sections')
      ]);
      setExams(examsRes.data.paylod.exams || []);
      setClasses(classesRes.data.paylod.classes || []);
      setSections(sectionsRes.data.paylod.sections || []);
    } catch (error) {
      toast.error('Failed to load filter metadata.');
    }
  };

  const filteredSections = sections.filter(
    (s) => s.class_id === parseInt(transClass, 10)
  );

  useEffect(() => {
    if (transClass) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [transClass, transSection]);

  const fetchStudents = async () => {
    try {
      let url = `/api/students?class_id=${transClass}`;
      if (transSection && transSection !== 'all') {
        url += `&section_id=${transSection}`;
      }
      const response = await axios.get(url);
      setStudents(response.data.paylod.students || []);
    } catch (error) {
      toast.error('Failed to load students.');
    }
  };

  const handleLoadTranscript = async () => {
    if (!transStudent || !transExam) {
      toast.error('Please select both Student and Exam.');
      return;
    }

    setLoadingTranscript(true);
    setTranscriptData(null);
    try {
      const response = await axios.get(
        `/api/students/transcripts?student_id=${transStudent}&exam_id=${transExam}`
      );
      setTranscriptData(response.data.paylod);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up print:p-0 print:bg-white print:shadow-none">
      
      {/* Top Header - Hidden on print */}
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiFileText className="text-primary" /> Student Transcript Cards
        </h1>
        <p className="text-sm text-slate-500">
          Compile and download official academic transcript sheets per student.
        </p>
      </div>

      {/* Selectors card - Hidden on print */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiCalendar /> Select Exam
            </label>
            <select
              value={transExam}
              onChange={(e) => setTransExam(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary bg-slate-55 bg-slate-50"
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
              value={transClass}
              onChange={(e) => {
                setTransClass(e.target.value);
                setTransSection('');
                setTransStudent('');
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
              value={transSection}
              onChange={(e) => {
                setTransSection(e.target.value);
                setTransStudent('');
              }}
              disabled={!transClass}
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
              <FiUser /> Student
            </label>
            <select
              value={transStudent}
              onChange={(e) => setTransStudent(e.target.value)}
              disabled={students.length === 0}
              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary disabled:opacity-50 bg-slate-50"
            >
              <option value="">-- Choose Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.registration_number})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleLoadTranscript}
            disabled={loadingTranscript}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform duration-150 cursor-pointer disabled:opacity-50"
          >
            {loadingTranscript ? (
              <FiEye className="animate-spin text-sm" />
            ) : (
              <FiEye className="text-sm" />
            )}
            Compile Transcript
          </button>
        </div>
      </div>

      {/* Transcript Card display sheet */}
      {transcriptData && (
        <div className="w-full flex flex-col gap-4">
          
          <div className="flex justify-end print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FiPrinter /> Print Transcript Card
            </button>
          </div>

          <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-[32px] p-8 md:p-12 shadow-[0_15px_50px_rgba(0,0,0,0.04)] print:border-none print:shadow-none print:p-4">
            <div className="flex flex-col items-center justify-center text-center pb-6 border-b-2 border-slate-100">
              <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center font-bold text-2xl mb-3">
                FIT
              </div>
              <h2 className="text-xl font-semibold text-slate-850 tracking-tight">FUTURE INSTITUTE OF TECHNOLOGY</h2>
              <p className="text-[10px] text-slate-450 uppercase tracking-widest font-semibold mt-1">Official Academic Transcript</p>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6 py-6 text-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name</span>
                <p className="font-semibold text-slate-800 mt-0.5">{transcriptData.student.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registration Number</span>
                <p className="font-semibold text-slate-800 mt-0.5">{transcriptData.student.registration_number}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Class</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Class {transcriptData.student.class_name} 
                  {transcriptData.student.section_name ? ` (Sec ${transcriptData.student.section_name})` : ''}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exam Term</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {exams.find(e => (e.id || e.exam_id) === parseInt(transExam, 10))?.name || 'Academic Term'}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Name</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Score Obtained</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Max Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {transcriptData.subjectMarks.map((sm, index) => (
                    <tr key={index}>
                      <td className="px-5 py-3 font-bold text-slate-800">{sm.subject_name}</td>
                      <td className="px-5 py-3 font-semibold text-slate-500">{sm.subject_code}</td>
                      <td className="px-5 py-3 font-bold text-center text-slate-800">{parseFloat(sm.marks_obtained).toFixed(2)}</td>
                      <td className="px-5 py-3 font-semibold text-center text-slate-500">{parseFloat(sm.total_marks).toFixed(2)}</td>
                    </tr>
                  ))}
                  {transcriptData.subjectMarks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400 italic">No subject marks recorded for this exam.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
                <p className="text-lg font-semibold text-slate-800 mt-0.5">
                  {parseFloat(transcriptData.overallResult.total_marks || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GPA Achieved</span>
                <p className="text-lg font-semibold text-primary mt-0.5">
                  {parseFloat(transcriptData.overallResult.gpa || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Grade</span>
                <p className="text-lg font-semibold text-primary mt-0.5">
                  {transcriptData.overallResult.grade || 'Pending'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end mt-12 pt-8 border-t border-dashed border-slate-200">
              <div className="text-center">
                <div className="w-36 border-b border-slate-300 pb-1"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">Prepared By</span>
              </div>
              <div className="text-center">
                <div className="w-36 border-b border-slate-300 pb-1"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">Principal / Registrar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTranscriptsPage;

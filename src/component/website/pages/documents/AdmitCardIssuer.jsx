'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiFileText, FiSearch, FiPrinter, FiCheckCircle,
  FiCalendar, FiArrowLeft, FiCheckSquare, FiSquare, FiUsers
} from 'react-icons/fi';
import axios from 'axios';
import { printAdmitCard } from '@/lib/receipts/admit_card';

export default function AdmitCardIssuer() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch available exams on mount
  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const res = await axios.get('/api/staff/registrar/documents/admit-card');
      if (res.data.success) {
        setExams(res.data.paylod.exams || []);
      }
    } catch (err) {
      toast.error('Failed to load available exams.');
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // 2. Fetch paid students when an exam is selected
  const handleSelectExam = async (exam) => {
    setSelectedExam(exam);
    setSelectedStudentIds([]);
    setLoadingStudents(true);

    try {
      const res = await axios.get(`/api/staff/registrar/documents/admit-card?exam_id=${exam.id}`);
      if (res.data.success) {
        setStudents(res.data.paylod.students || []);
      }
    } catch (err) {
      toast.error('Failed to load eligible paid students for this exam.');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Toggle single student checkbox
  const toggleStudentSelection = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  // Filtered student list by search
  const filteredStudents = students.filter(st => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.registration_number && st.registration_number.toLowerCase().includes(q)) ||
      (st.roll && String(st.roll).includes(q))
    );
  });

  // Toggle select all eligible students
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(st => st.id));
    }
  };

  // 3. Submit Admit Cards generation
  const handleIssueAdmitCards = async () => {
    if (!selectedExam) { toast.error('Please select an exam.'); return; }
    if (selectedStudentIds.length === 0) { toast.error('Please select at least one student.'); return; }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/staff/registrar/documents/admit-card', {
        exam_id: selectedExam.id,
        student_ids: selectedStudentIds
      });

      if (res.data.success) {
        toast.success(`Generated Admit Cards for ${selectedStudentIds.length} student(s)!`);
        printAdmitCard(res.data.paylod.items);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue admit cards.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto pb-16 animate-fade-up">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <FiFileText /> Examination Registry
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exam Admit Cards Desk</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Select an active examination, review students who have cleared exam fees, and issue admit cards in bulk or individually.
          </p>
        </div>

        {selectedExam && (
          <button onClick={() => { setSelectedExam(null); setStudents([]); setSelectedStudentIds([]); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0">
            <FiArrowLeft /> Change Exam
          </button>
        )}
      </div>

      {/* STEP 1: EXAM SELECTION (When no exam is selected) */}
      {!selectedExam && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FiCalendar className="text-primary" /> Step 1: Select Available Examination
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{exams.length} Available Exam(s)</span>
          </div>

          {loadingExams ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading available examinations...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 italic bg-white border border-slate-200 rounded-3xl p-8">
              No active or upcoming examinations found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((ex) => (
                <div key={ex.id} onClick={() => handleSelectExam(ex)}
                  className="bg-white border border-slate-200/80 hover:border-primary p-5 rounded-3xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-xl">
                        {ex.class_name}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {ex.term || 'Term Exam'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors">
                      {ex.name}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5 text-primary">
                      <FiCalendar className="text-sm" /> Select Exam & View Paid Students
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2 & 3: PAID STUDENTS LIST & ADMIT CARD ISSUANCE */}
      {selectedExam && (
        <div className="space-y-6">
          {/* Selected Exam Overview Card */}
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-lg uppercase">
                  Selected Exam
                </span>
                <span className="text-xs font-bold text-primary">{selectedExam.class_name}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{selectedExam.name} ({selectedExam.term})</h2>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleIssueAdmitCards} disabled={submitting || selectedStudentIds.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50">
                <FiPrinter className="text-sm" />
                {submitting ? 'Generating...' : `Print Admit Cards (${selectedStudentIds.length})`}
              </button>
            </div>
          </div>

          {/* Paid Students Roster */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FiUsers className="text-primary text-sm" /> Step 2: Select Fee-Cleared Students
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {students.length} Eligible Student(s)
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <form onSubmit={(e) => e.preventDefault()} className="relative flex-grow sm:w-64">
                  <input type="text" placeholder="Search by student name or roll..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <FiSearch className="absolute left-2.5 top-2 text-slate-400 text-xs" />
                </form>

                {filteredStudents.length > 0 && (
                  <button type="button" onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0">
                    {selectedStudentIds.length === filteredStudents.length ? <FiCheckSquare className="text-primary" /> : <FiSquare />}
                    <span>{selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}</span>
                  </button>
                )}
              </div>
            </div>

            {loadingStudents ? (
              <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
                Fetching students who cleared exam fees...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                No fee-cleared students found matching your filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudents.map((st) => {
                  const isChecked = selectedStudentIds.includes(st.id);
                  return (
                    <div key={st.id} onClick={() => toggleStudentSelection(st.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs' : 'bg-slate-50/70 border-slate-200/80 hover:bg-white text-slate-800'
                      }`}>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold leading-tight">{st.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Roll #{st.roll || 'N/A'} • Reg: {st.registration_number || 'N/A'}
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-semibold mt-1">
                          <FiCheckCircle className="text-xs text-emerald-600" /> Exam Fee Cleared
                        </div>
                      </div>

                      <div className="text-lg">
                        {isChecked ? <FiCheckSquare className="text-primary" /> : <FiSquare className="text-slate-300" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

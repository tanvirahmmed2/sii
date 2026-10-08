'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FiTrendingUp, 
  FiCheckSquare, 
  FiSquare, 
  FiAlertTriangle, 
  FiArrowRight, 
  FiCheckCircle, 
  FiXCircle, 
  FiAward, 
  FiUsers, 
  FiRefreshCw,
  FiFilter
} from 'react-icons/fi';

const StudentPromotePage = () => {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);

  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [sortBy, setSortBy] = useState('gpa'); // 'gpa' or 'total'
  const [admissionFee, setAdmissionFee] = useState('0');

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  
  const [promoting, setPromoting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalPromotionData, setModalPromotionData] = useState(null);

  // 1. Load Classes on Mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/classes');
        const resData = await res.json();
        if (res.ok && resData.success) {
          const clsList = Array.isArray(resData.paylod?.classes)
            ? resData.paylod.classes
            : Array.isArray(resData.paylod)
              ? resData.paylod
              : [];
          setClasses(clsList);
          if (clsList.length > 0) {
            setSourceClassId(clsList[0].id.toString());
            if (clsList.length > 1) {
              setTargetClassId(clsList[1].id.toString());
            } else {
              setTargetClassId(clsList[0].id.toString());
            }
          }
        }
      } catch (err) {
        toast.error('Failed to load academic classes.');
      }
    };
    fetchClasses();
  }, []);

  // 2. Load Exams & Auto-set Target Class when Source Class changes
  useEffect(() => {
    if (!sourceClassId) return;

    // Auto-suggest next sequential target class
    if (Array.isArray(classes)) {
      const sourceIdx = classes.findIndex(c => String(c.id) === String(sourceClassId));
      if (sourceIdx !== -1 && sourceIdx + 1 < classes.length) {
        setTargetClassId(classes[sourceIdx + 1].id.toString());
      }
    }

    const fetchExams = async () => {
      try {
        const res = await fetch(`/api/exams?class_id=${sourceClassId}`);
        const resData = await res.json();
        if (res.ok && resData.success) {
          // API returns paylod: { exams: [...] }
          const rawPayload = resData.paylod;
          const exList = Array.isArray(rawPayload?.exams)
            ? rawPayload.exams.filter(ex => String(ex.class_id) === String(sourceClassId))
            : Array.isArray(rawPayload)
              ? rawPayload
              : [];
          setExams(exList);
          if (exList.length > 0) {
            setSelectedExamId(exList[0].id.toString());
          } else {
            setSelectedExamId('');
          }
        }
      } catch (err) {
        console.error('Error fetching exams:', err);
      }
    };
    fetchExams();
  }, [sourceClassId, classes]);

  // 3. Load Students Matrix & Results when Source Class, Exam, or SortBy changes
  useEffect(() => {
    if (!sourceClassId || !selectedExamId) {
      setStudents([]);
      setSelectedStudentIds([]);
      return;
    }

    const fetchStudentsMatrix = async () => {
      setLoadingStudents(true);
      try {
        const url = `/api/students/marks?exam_id=${selectedExamId}&class_id=${sourceClassId}&mode=matrix&sort_by=${sortBy}`;
        const res = await fetch(url);
        const resData = await res.json();
        if (res.ok && resData.success && resData.paylod?.students) {
          const loadedStudents = resData.paylod.students || [];
          setStudents(loadedStudents);
          // Default select all passing students
          const passIds = loadedStudents.filter(st => st.status === 'Pass' && st.overall_grade !== 'F').map(st => st.student_id);
          setSelectedStudentIds(passIds);
        } else {
          setStudents([]);
          setSelectedStudentIds([]);
        }
      } catch (err) {
        toast.error('Failed to load student roster for promotion.');
        setStudents([]);
        setSelectedStudentIds([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsMatrix();
  }, [sourceClassId, selectedExamId, sortBy]);

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(st => st.student_id));
    }
  };

  const handleToggleStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(stId => stId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // Option 1: Promote All Passed Students
  const handlePromoteAllPassed = () => {
    const passedStudents = students.filter(st => st.status === 'Pass' && st.overall_grade !== 'F');
    if (passedStudents.length === 0) {
      toast.error('No passed students found in this class for the selected exam.');
      return;
    }

    const passIds = passedStudents.map(st => st.student_id);
    const targetClassName = classes.find(c => String(c.id) === String(targetClassId))?.name || 'Target Class';
    const sourceClassName = classes.find(c => String(c.id) === String(sourceClassId))?.name || 'Source Class';

    setModalPromotionData({
      mode: 'passed',
      studentIds: passIds,
      count: passedStudents.length,
      includeFailed: false,
      hasFailedSelected: false,
      sourceClassName,
      targetClassName
    });
    setShowConfirmModal(true);
  };

  // Option 2: Promote Selected Students
  const handlePromoteSelected = () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to promote.');
      return;
    }

    const selectedObjs = students.filter(st => selectedStudentIds.includes(st.student_id));
    const hasFailed = selectedObjs.some(st => st.status !== 'Pass' || st.overall_grade === 'F');

    const targetClassName = classes.find(c => String(c.id) === String(targetClassId))?.name || 'Target Class';
    const sourceClassName = classes.find(c => String(c.id) === String(sourceClassId))?.name || 'Source Class';

    setModalPromotionData({
      mode: 'selective',
      studentIds: selectedStudentIds,
      count: selectedStudentIds.length,
      includeFailed: hasFailed,
      hasFailedSelected: hasFailed,
      sourceClassName,
      targetClassName
    });
    setShowConfirmModal(true);
  };

  // Execute Promotion API Call
  const executePromotion = async () => {
    if (!modalPromotionData) return;

    setPromoting(true);
    try {
      const res = await fetch('/api/admin/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_class_id: parseInt(sourceClassId, 10),
          target_class_id: parseInt(targetClassId, 10),
          exam_id: parseInt(selectedExamId, 10),
          sort_by: sortBy,
          student_ids: modalPromotionData.studentIds,
          include_failed: modalPromotionData.includeFailed,
          admission_fee: parseFloat(admissionFee) || 0
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message || 'Students promoted successfully!');
        setShowConfirmModal(false);
        // Refresh student list
        setStudents(prev => prev.filter(st => !modalPromotionData.studentIds.includes(st.student_id)));
        setSelectedStudentIds([]);
      } else {
        toast.error(resData.error || resData.message || 'Failed to promote students.');
      }
    } catch (err) {
      toast.error('An error occurred during promotion process.');
    } finally {
      setPromoting(false);
    }
  };

  // Target class numeric helper for predicting new roll numbers
  const getTargetClassNumeric = () => {
    const cls = classes.find(c => String(c.id) === String(targetClassId));
    if (!cls) return '7';
    const match = String(cls.numeric_name || cls.name).match(/\d+/);
    return match ? match[0] : '7';
  };

  const targetClassNum = getTargetClassNumeric();

  return (
    <div className="w-full min-h-screen py-8 px-4 md:px-8 max-w-6xl mx-auto flex flex-col gap-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FiTrendingUp className="text-primary" /> Academic Student Promotion Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Promote eligible students to higher academic classes with merit-based roll number recalculation.
          </p>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col gap-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Source Class */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Source Academic Class *
            </label>
            <select
              value={sourceClassId}
              onChange={(e) => setSourceClassId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Term Examination *
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {exams.length === 0 ? (
                <option value="">-- No Exams Available --</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} {ex.term ? `(${ex.term})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Target Class */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              Promote To Class <FiArrowRight className="text-primary" />
            </label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Re-Admission Fee Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Re-Admission Fee (৳) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={admissionFee}
              onChange={(e) => setAdmissionFee(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
            />
          </div>

        </div>

        {/* Merit Criteria Selector */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FiAward className="text-primary text-base" />
            <span className="text-xs font-bold text-slate-700">Merit Ranking Basis:</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSortBy('gpa')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'gpa'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Grade Point Average (GPA)
            </button>
            <button
              type="button"
              onClick={() => setSortBy('total')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'total'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Total Marks Obtained
            </button>
          </div>
        </div>

      </div>

      {/* Roster & Actions Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col gap-6">
        
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FiUsers className="text-primary" /> Candidate Roster ({students.length})
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
              Passed: {students.filter(st => st.status === 'Pass' && st.overall_grade !== 'F').length}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
              Failed: {students.filter(st => st.status !== 'Pass' || st.overall_grade === 'F').length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Option 1 Button */}
            <button
              type="button"
              onClick={handlePromoteAllPassed}
              disabled={loadingStudents || students.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Promote All Passed
            </button>
            <button
              type="button"
              onClick={handlePromoteSelected}
              disabled={loadingStudents || selectedStudentIds.length === 0}
              className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            > Promote Selected ({selectedStudentIds.length})
            </button>
          </div>
        </div>

        {/* Roster Table */}
        {loadingStudents ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading student performance matrix...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">
            No students or compiled exam results found for this class and exam selection.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-10">
                    <button type="button" onClick={handleSelectAll} className="text-slate-500 hover:text-slate-800">
                      {selectedStudentIds.length === students.length ? <FiCheckSquare className="text-base text-primary" /> : <FiSquare className="text-base" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-12">#</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Curr. Roll</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student Name</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Reg No</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Marks</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">GPA</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Grade</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-indigo-600 uppercase tracking-widest text-center">New Roll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {students.map((st, idx) => {
                  const isSelected = selectedStudentIds.includes(st.student_id);
                  // Calculate predicted new roll based on position in current sorted array
                  const predictedRoll = `${targetClassNum}0${String(idx + 1).padStart(2, '0')}`;
                  const isPass = st.status === 'Pass' && st.overall_grade !== 'F';

                  return (
                    <tr 
                      key={st.student_id} 
                      className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-sky-50/20' : ''}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(st.student_id)}
                          className="w-4 h-4 text-primary accent-primary rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-3 py-3 text-center text-slate-700 font-bold">{st.roll || 'N/A'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{st.name}</td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{st.registration_number}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-slate-900">{st.total_obtained}</td>
                      <td className="px-3 py-3 text-center font-extrabold text-primary">{st.gpa.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${st.overall_grade === 'F' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {st.overall_grade}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                            <FiCheckCircle /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
                            <FiXCircle /> FAIL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-indigo-600 bg-indigo-50/20 rounded-lg">
                        {predictedRoll}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && modalPromotionData && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl flex flex-col gap-5">
            
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                modalPromotionData.hasFailedSelected ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-primary'
              }`}>
                {modalPromotionData.hasFailedSelected ? <FiAlertTriangle /> : <FiTrendingUp />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Confirm Student Promotion
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modalPromotionData.sourceClassName} &rarr; {modalPromotionData.targetClassName}
                </p>
              </div>
            </div>

            {modalPromotionData.hasFailedSelected && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-700 flex flex-col gap-1 font-medium">
                <strong className="font-bold flex items-center gap-1 text-rose-800">
                  <FiAlertTriangle /> Warning: Failing Students Included!
                </strong>
                <span>
                  You have selected candidate(s) who received an <strong>F grade / Fail status</strong>. Promoting them will update their academic class and assign a new merit roll number.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to promote <strong>{modalPromotionData.count} student(s)</strong> from <strong>{modalPromotionData.sourceClassName}</strong> to <strong>{modalPromotionData.targetClassName}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={promoting}
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={promoting}
                onClick={executePromotion}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-sky-500/10 disabled:opacity-50"
              >
                {promoting ? 'Promoting...' : 'Confirm & Promote'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotePage;

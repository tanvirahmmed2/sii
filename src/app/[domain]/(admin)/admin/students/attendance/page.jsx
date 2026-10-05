'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiLayers, FiCheckCircle, FiSave, FiAlertCircle } from 'react-icons/fi';

const AdminStudentAttendancePage = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);

  // Selections
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial lookup lists
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const classesRes = await fetch('/api/classes');
        const classesData = await classesRes.json();
        setClasses(classesData.paylod.classes || []);

        const subjectsRes = await fetch('/api/subjects');
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.paylod.subjects || []);

        const periodsRes = await fetch('/api/periods');
        const periodsData = await periodsRes.json();
        setPeriods(periodsData.paylod.periods || []);
      } catch (err) {
        toast.error('Failed to load initial metadata.');
      }
    };
    fetchLookupData();
  }, []);

  // Fetch sections based on class selection
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      setStudents([]);
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await fetch(`/api/sections?class_id=${selectedClassId}`);
        const data = await res.json();
        setSections(data.paylod.sections || []);
        if (data.paylod.sections?.length > 0) {
          setSelectedSectionId(data.paylod.sections[0].id.toString());
        } else {
          setSelectedSectionId('');
          setStudents([]);
        }
      } catch (err) {
        toast.error('Failed to load class sections.');
      }
    };
    fetchSections();
  }, [selectedClassId]);

  // Fetch student roster + attendance log for active date/class/section/subject/period
  const fetchAttendanceSheet = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedDate || !selectedSubjectId || !selectedPeriodId) return;

    setLoadingSheet(true);
    try {
      const res = await fetch(
        `/api/students/attendance?class_id=${selectedClassId}&section_id=${selectedSectionId}&date=${selectedDate}&subject_id=${selectedSubjectId}&period_id=${selectedPeriodId}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load attendance.');
      
      // Map records to state
      setStudents(
        (data.paylod?.attendanceSheet || []).map((std) => ({
          student_id: std.student_id,
          name: std.student_name,
          registration_number: std.registration_number,
          status: std.status || 'Present',
          remarks: std.remarks || ''
        }))
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSheet();
  }, [selectedClassId, selectedSectionId, selectedDate, selectedSubjectId, selectedPeriodId]);

  // Handle local status changes
  const handleStatusChange = (studentId, newStatus) => {
    setStudents(
      students.map((std) => (std.student_id === studentId ? { ...std, status: newStatus } : std))
    );
  };

  // Handle local remarks changes
  const handleRemarksChange = (studentId, newRemarks) => {
    setStudents(
      students.map((std) => (std.student_id === studentId ? { ...std, remarks: newRemarks } : std))
    );
  };

  // Bulk actions
  const handleMarkAll = (status) => {
    setStudents(students.map((std) => ({ ...std, status })));
    toast.success(`Marked all students as ${status}.`);
  };

  // Submit bulk attendance
  const handleSubmitAttendance = async () => {
    if (students.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/students/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          section_id: selectedSectionId,
          date: selectedDate,
          subject_id: selectedSubjectId,
          period_id: selectedPeriodId,
          records: students.map((std) => ({
            student_id: std.student_id,
            status: std.status,
            remarks: std.remarks
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log attendance sheet.');

      toast.success(data.message || 'Attendance sheet saved successfully.');
      fetchAttendanceSheet();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiCalendar className="text-primary" /> Student Attendance Registry
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Perform bulk daily attendance logs for students matching class/section structures.
        </p>
      </div>

      {/* Roster sheet selectors card */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Academic Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary"
          >
            <option value="">Select a class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Section
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedClassId}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary disabled:opacity-60 bg-slate-50"
          >
            <option value="">Select a section...</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary bg-slate-50"
          >
            <option value="">Select subject...</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Period
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary bg-slate-50"
          >
            <option value="">Select period...</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.start_time} - {p.end_time})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiCalendar /> Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-primary"
          />
        </div>
      </div>

      {/* Attendance Logging Grid Sheet */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Table header with actions */}
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-base font-bold text-slate-800">
            Attendance Log Registry sheet ({students.length} students)
          </h2>

          {students.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleMarkAll('Present')}
                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                All Present
              </button>
              <button
                onClick={() => handleMarkAll('Absent')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                All Absent
              </button>
              <button
                onClick={() => handleMarkAll('Late')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                All Late
              </button>
            </div>
          )}
        </div>

        {!selectedClassId || !selectedSectionId || !selectedSubjectId || !selectedPeriodId ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-6xl mb-4">📅</span>
            <h3 className="text-sm font-bold text-slate-600">No Roster Selected</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Select a class, section, subject, period, and targeted date from the menus above to access the daily attendance sheet.
            </p>
          </div>
        ) : loadingSheet ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading attendance logs...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-6xl mb-4">🔔</span>
            <h3 className="text-sm font-bold text-slate-600">Roster Sheet Empty</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              There are no registered students inside the selected class section. Verify rosters inside student lists.
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-55/50 border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Registration No
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Attendance Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Remarks / Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((std) => (
                    <tr key={std.student_id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-xl">
                          {std.registration_number}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-800">{std.name}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {['Present', 'Absent', 'Late'].map((statusOption) => {
                            let badgeStyle = 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100';
                            if (std.status === statusOption) {
                              if (statusOption === 'Present') badgeStyle = 'bg-green-550 bg-green-50 text-green-600 border border-green-200';
                              if (statusOption === 'Absent') badgeStyle = 'bg-red-550 bg-red-550 bg-red-50 text-red-600 border border-red-200';
                              if (statusOption === 'Late') badgeStyle = 'bg-amber-50 text-amber-600 border border-amber-200';
                            }

                            return (
                              <button
                                key={statusOption}
                                onClick={() => handleStatusChange(std.student_id, statusOption)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${badgeStyle}`}
                              >
                                {statusOption}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={std.remarks}
                          onChange={(e) => handleRemarksChange(std.student_id, e.target.value)}
                          className="w-full max-w-72 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <FiAlertCircle /> Verify student logs before submitting.
              </span>

              <button
                onClick={handleSubmitAttendance}
                disabled={submitting}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="text-base" /> Save Attendance Sheet
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStudentAttendancePage;

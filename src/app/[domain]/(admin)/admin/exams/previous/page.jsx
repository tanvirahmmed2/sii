'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiMapPin, FiLayers, FiBook, FiTrash2, FiX } from 'react-icons/fi';

const AdminPreviousExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamSchedules, setSelectedExamSchedules] = useState({});

  const fetchExams = async () => {
    try {
      const response = await axios.get('/api/exams?status=previous');
      const examsList = response.data.paylod.exams || [];
      setExams(examsList);

      // Fetch schedules for each exam
      for (const exam of examsList) {
        fetchSchedules(exam.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to fetch previous exams.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (examId) => {
    try {
      const res = await axios.get(`/api/exams/${examId}`);
      setSelectedExamSchedules((prev) => ({
        ...prev,
        [examId]: res.data.paylod.schedules || [],
      }));
    } catch (err) {
      console.error(`Failed to fetch schedules for exam ${examId}`, err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDeleteExam = async (id, examName) => {
    const confirm = window.confirm(
      `Are you sure you want to delete the past exam routine for "${examName}"? This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      const response = await axios.delete(`/api/exams/${id}`);
      toast.success(response.data.message || 'Exam routine deleted successfully.');
      setExams(exams.filter((exam) => exam.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to delete exam routine.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Top Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiCalendar className="text-primary" /> Previous Exams Registry
        </h1>
        <p className="text-sm text-slate-500">
          View and manage historically archived exam routines and logs.
        </p>
      </div>

      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-400">Loading archived exams...</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4 bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
          <span className="text-slate-350 text-5xl mb-3">📁</span>
          <h3 className="text-sm font-bold text-slate-655 text-slate-600">No Previous Exams Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
            No historical records have been archived in this registry yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {exams.map((exam) => {
            const startStr = new Date(exam.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const endStr = new Date(exam.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const schedulesList = selectedExamSchedules[exam.id] || [];

            return (
              <div key={exam.id} className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
                
                {/* Header info */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      {exam.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                      {exam.term && (
                        <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          {exam.term}
                        </span>
                      )}
                      {exam.class_name && (
                        <span className="font-semibold text-primary bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          Class: {exam.class_name}
                        </span>
                      )}
                      {exam.exam_fee !== undefined && (
                        <span className="font-semibold text-primary bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          Exam Fee: {exam.exam_fee} BDT
                        </span>
                      )}
                      <span>
                        Timeline: <strong>{startStr}</strong> to <strong>{endStr}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.name)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-655 text-red-600 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Delete Exam Routine"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Schedules table */}
                <div className="p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Exam Schedules</h3>
                  {schedulesList.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-150 rounded-2xl">
                      <p className="text-xs text-slate-400">No schedules mapped for this past exam routine.</p>
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-55 border-b border-slate-100 bg-slate-50/50">
                            <th className="px-4 py-3 font-bold text-slate-500">Class</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Subject</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Exam Date</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Timings</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Room</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schedulesList.map((schedule) => (
                            <tr key={schedule.id} className="hover:bg-slate-50/20 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-700">
                                <span className="inline-flex items-center gap-1">
                                  <FiLayers className="text-slate-400" /> {schedule.class_name}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-700">
                                <span className="inline-flex items-center gap-1">
                                  <FiBook className="text-slate-400" /> {schedule.subject_name}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-655">
                                {new Date(schedule.exam_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-slate-655 font-mono">
                                <span className="inline-flex items-center gap-1">
                                  <FiClock className="text-slate-400" /> {schedule.start_time} - {schedule.end_time}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono text-[10px]">
                                  <FiMapPin className="text-[10px]" /> {schedule.room_number || 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPreviousExamsPage;

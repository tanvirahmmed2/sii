'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiAward, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';

const StudentResultsPage = () => {
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const response = await axios.get('/api/students/results');
      setExams(response.data.paylod?.exams || response.data.exams || []);
    } catch (error) {
      toast.error('Failed to load exam publications.');
    } finally {
      setLoadingExams(false);
    }
  };

  const handleTogglePublication = async (examId, currentPublished) => {
    const confirm = window.confirm(
      currentPublished 
        ? 'Are you sure you want to unpublish results for this exam? Students will no longer see them.'
        : 'Are you sure you want to compile and publish results for this exam? This will run GPA grading calculations for all students.'
    );
    if (!confirm) return;

    setLoadingExams(true);
    try {
      const response = await axios.post('/api/students/results', {
        exam_id: examId,
        is_published: !currentPublished
      });

      toast.success(response.data.message || 'Exam status updated successfully.');
      fetchExams(); // reload
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
      setLoadingExams(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiAward className="text-primary" /> Publish Exam Results
        </h1>
        <p className="text-sm text-slate-500">
          Select an exam term to run grading compilations and toggle student results availability.
        </p>
      </div>

      {/* Publications Table */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Exam Publications Overview
          </h2>
          <button 
            onClick={fetchExams}
            disabled={loadingExams}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-700"
            title="Refresh publications list"
          >
            <FiRefreshCw className={`text-sm ${loadingExams ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingExams && exams.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading publications...</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-350 text-5xl mb-3">📢</span>
            <h3 className="text-sm font-bold text-slate-600">No Exams Registered</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              Add exams under Exam Management first to see publication options.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Term</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Publication Release</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((ex) => {
                  const examId = ex.id || ex.exam_id;
                  const startDateStr = new Date(ex.start_date).toLocaleDateString();
                  const endDateStr = new Date(ex.end_date).toLocaleDateString();

                  return (
                    <tr key={examId} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-850">{ex.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">{ex.term || 'Unspecified Term'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        {startDateStr} - {endDateStr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          ex.is_published 
                            ? 'bg-emerald-50 text-primary border border-emerald-200/60' 
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {ex.is_published ? 'Released / Published' : 'Draft / Unpublished'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <button
                          onClick={() => handleTogglePublication(examId, ex.is_published)}
                          disabled={loadingExams}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors duration-150 ${
                            ex.is_published
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-primary hover:bg-emerald-50'
                          }`}
                        >
                          {ex.is_published ? (
                            <>
                              <FiXCircle /> Unpublish Results
                            </>
                          ) : (
                            <>
                              <FiCheckCircle /> Compile & Publish
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentResultsPage;

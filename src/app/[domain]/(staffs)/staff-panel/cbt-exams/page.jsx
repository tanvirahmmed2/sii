'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCheckSquare, FiFileText, FiShield, FiAlertTriangle, FiPlus, FiTrash2, FiRefreshCw, FiClock, FiSettings } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function CBTExamsStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('papers'); 
  const [data, setData] = useState({ question_banks: [], exam_papers: [], proctor_logs: [], classes: [], subjects: [] });

  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperClassId, setPaperClassId] = useState('');
  const [paperSubjectId, setPaperSubjectId] = useState('');
  const [paperDuration, setPaperDuration] = useState(60);
  const [paperTotalMarks, setPaperTotalMarks] = useState(100);
  const [paperPassMarks, setPaperPassMarks] = useState(40);
  const [paperProctoring, setPaperProctoring] = useState(true);
  const [submittingPaper, setSubmittingPaper] = useState(false);

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [bankClassId, setBankClassId] = useState('');
  const [bankSubjectId, setBankSubjectId] = useState('');
  const [bankDesc, setBankDesc] = useState('');
  const [submittingBank, setSubmittingBank] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/cbt-exams'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('CBT Exam & Proctoring data refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load CBT exam records');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to exam service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreatePaper = async (e) => {
    e.preventDefault();
    if (!paperTitle.trim()) return;
    setSubmittingPaper(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_paper',
        title: paperTitle.trim(),
        class_id: paperClassId || null,
        subject_id: paperSubjectId || null,
        duration_minutes: paperDuration,
        total_marks: paperTotalMarks,
        pass_marks: paperPassMarks,
        proctoring_enabled: paperProctoring,
        randomize_questions: true,
        randomize_options: true,
        status: 'scheduled',
      });
      if (res.data?.success) {
        toast.success('Online CBT exam paper scheduled');
        setIsPaperModalOpen(false);
        setPaperTitle('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create exam paper');
      }
    } catch (err) {
      toast.error('Error creating exam paper');
    } finally {
      setSubmittingPaper(false);
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    if (!bankTitle.trim()) return;
    setSubmittingBank(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_bank',
        title: bankTitle.trim(),
        class_id: bankClassId || null,
        subject_id: bankSubjectId || null,
        description: bankDesc.trim(),
      });
      if (res.data?.success) {
        toast.success('Question bank created');
        setIsBankModalOpen(false);
        setBankTitle('');
        setBankDesc('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create question bank');
      }
    } catch (err) {
      toast.error('Error creating question bank');
    } finally {
      setSubmittingBank(false);
    }
  };

  const handleDeletePaper = async (paperId) => {
    if (!confirm('Are you sure you want to delete this exam paper?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?paper_id=${paperId}`);
      if (res.data?.success) {
        toast.success('Exam paper deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete exam paper');
    }
  };

  if (loading) {
    return <Loader message="Loading Online Exam (CBT) & Proctoring Console..." />;
  }

  const { question_banks, exam_papers, proctor_logs, classes, subjects } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiCheckSquare className="text-primary" /> Online Exam (CBT) & AI Proctoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create randomized CBT exam papers, question banks with LaTeX math formulas, and monitor real-time proctoring violations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setIsPaperModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> New Exam Paper
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('papers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'papers'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiFileText /> Exam Papers ({exam_papers.length})
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'banks'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiCheckSquare /> Question Banks ({question_banks.length})
        </button>
        <button
          onClick={() => setActiveTab('proctoring')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'proctoring'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiShield /> Proctoring Incident Logs ({proctor_logs.length})
        </button>
      </div>

      {activeTab === 'papers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Paper Title</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Marks</th>
                  <th className="px-6 py-3">Proctoring</th>
                  <th className="px-6 py-3">Attempts</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {exam_papers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                      No CBT exam papers created yet. Click &quot;New Exam Paper&quot; to configure a proctored exam.
                    </td>
                  </tr>
                ) : (
                  exam_papers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {p.title}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-1 text-slate-500">
                        <FiClock className="text-xs" /> {p.duration_minutes} mins
                      </td>
                      <td className="px-6 py-4">
                        {p.total_marks} (Pass: {p.pass_marks})
                      </td>
                      <td className="px-6 py-4">
                        {p.proctoring_enabled ? (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded flex items-center gap-1 w-fit">
                            <FiShield /> Enabled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs text-slate-500">Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-primary">
                        {p.attempt_count || 0} Submissions
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs uppercase font-bold rounded bg-blue-100 text-blue-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeletePaper(p.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                          title="Delete Paper"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'banks' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Question Repositories</h2>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
            >
              <FiPlus /> New Question Bank
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {question_banks.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No question banks added yet.
              </div>
            ) : (
              question_banks.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-white">{b.title}</div>
                  <p className="text-xs text-slate-500">{b.description || 'General questions bank'}</p>
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>{b.question_count || 0} Questions</span>
                    <span className="text-emerald-500 font-medium">LaTeX Supported</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'proctoring' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FiAlertTriangle className="text-amber-500" /> AI Proctoring Violation Feed
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Paper</th>
                  <th className="px-6 py-3">Violation Type</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Student ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {proctor_logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                      No proctoring violations recorded. Exams are running clean.
                    </td>
                  </tr>
                ) : (
                  proctor_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(log.logged_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {log.paper_title}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-red-600 dark:text-red-400">
                        {log.violation_type}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                          log.severity === 'high' || log.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">#{log.student_id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isPaperModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Schedule CBT Exam Paper</h3>
            <form onSubmit={handleCreatePaper} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Paper Title</label>
                <input
                  type="text"
                  placeholder="e.g. Higher Math Midterm 2026"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={paperDuration}
                    onChange={(e) => setPaperDuration(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    min="5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={paperTotalMarks}
                    onChange={(e) => setPaperTotalMarks(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="proctorToggle"
                  checked={paperProctoring}
                  onChange={(e) => setPaperProctoring(e.target.checked)}
                  className="rounded text-primary"
                />
                <label htmlFor="proctorToggle" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Enable AI Proctoring (Tab-switch, webcam & multi-face detection)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaperModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPaper}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingPaper ? 'Scheduling...' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">New Question Bank</h3>
            <form onSubmit={handleCreateBank} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Title</label>
                <input
                  type="text"
                  placeholder="e.g. Physics Chapter 3: Mechanics"
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  placeholder="Notes about difficulty and chapters..."
                  value={bankDesc}
                  onChange={(e) => setBankDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBank}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingBank ? 'Saving...' : 'Create Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


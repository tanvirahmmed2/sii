'use client';

import React, { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiSend,
  FiUsers,
  FiCalendar,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
  FiClock,
  FiInfo,
  FiX,
  FiRefreshCw,
  FiCheck,
} from 'react-icons/fi';

export default function FeesEducationMakePage() {
  const [meta, setMeta] = useState({ classes: [], sections: [], sessions: [] });
  const [classFees, setClassFees] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingFees, setLoadingFees] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form Fields
  const now = new Date();
  const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [formData, setFormData] = useState({
    class_id: '',
    section_id: 'all',
    session_id: '',
    education_fee_id: '',
    month_name: currentMonthName,
    due_date: '',
    custom_amount: '',
    fine_amount: '0',
    notes: '',
  });

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const res = await fetch('/api/fees/education/meta');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMeta({
            classes: json.classes || [],
            sections: json.sections || [],
            sessions: json.sessions || [],
          });
          if (json.classes.length > 0) {
            setFormData((prev) => ({
              ...prev,
              class_id: json.classes[0].id,
              session_id: json.sessions[0]?.id || '',
            }));
          }
        }
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
      showFeedback('error', 'Network error loading academic metadata.');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // When class changes, fetch configured fee rules for that class
  useEffect(() => {
    if (!formData.class_id) {
      setClassFees([]);
      return;
    }

    const fetchFees = async () => {
      setLoadingFees(true);
      try {
        const res = await fetch(`/api/fees/education?class_id=${formData.class_id}&status=active`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const feesList = json.data || [];
            setClassFees(feesList);
            if (feesList.length > 0) {
              const firstFee = feesList[0];
              // Set due date default based on fee's due_day_of_month
              const dueDay = firstFee.due_day_of_month || 10;
              const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay).toISOString().split('T')[0];
              setFormData((prev) => ({
                ...prev,
                education_fee_id: firstFee.id,
                custom_amount: firstFee.amount || '',
                due_date: defaultDueDate,
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                education_fee_id: '',
                custom_amount: '',
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error loading class fees:', err);
      } finally {
        setLoadingFees(false);
      }
    };

    fetchFees();
  }, [formData.class_id]);

  // When fee structure selection changes, update amount and due date
  const handleFeeSelect = (feeId) => {
    const selected = classFees.find((f) => String(f.id) === String(feeId));
    if (selected) {
      const dueDay = selected.due_day_of_month || 10;
      const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay).toISOString().split('T')[0];
      setFormData((prev) => ({
        ...prev,
        education_fee_id: selected.id,
        custom_amount: selected.amount,
        due_date: defaultDueDate,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        education_fee_id: feeId,
      }));
    }
  };

  // Preview eligible students whenever class, section, fee, or month changes
  useEffect(() => {
    if (!formData.class_id) {
      setPreviewData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const params = new URLSearchParams({
          class_id: formData.class_id,
          section_id: formData.section_id || 'all',
          education_fee_id: formData.education_fee_id || '',
          month_name: formData.month_name || '',
        });
        const res = await fetch(`/api/fees/education/make-due?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setPreviewData(json);
          }
        }
      } catch (err) {
        console.error('Error previewing students:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.class_id, formData.section_id, formData.education_fee_id, formData.month_name]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleMakeDueSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id) {
      showFeedback('error', 'Please select an academic class.');
      return;
    }
    if (!formData.education_fee_id) {
      showFeedback('error', 'Please select a configured education fee structure.');
      return;
    }
    if (!formData.month_name.trim()) {
      showFeedback('error', 'Please specify a billing month / period name.');
      return;
    }

    const countToGenerate = previewData?.eligibleStudentsCount || 0;
    if (countToGenerate === 0 && previewData?.existingDuesCount > 0) {
      showFeedback('error', `All students in this class already have dues generated for "${formData.month_name}".`);
      return;
    }

    const confirmMsg = `Are you sure you want to generate due fee invoices for ${countToGenerate} eligible students of ${
      meta.classes.find((c) => String(c.id) === String(formData.class_id))?.class_name || 'this class'
    } for "${formData.month_name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/fees/education/make-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        showFeedback(
          'success',
          resJson.message || `Successfully created ${resJson.createdCount} student fee invoices!`
        );
        // Refresh preview
        setPreviewData((prev) =>
          prev ? { ...prev, eligibleStudentsCount: 0, existingDuesCount: prev.totalStudents } : null
        );
      } else {
        showFeedback('error', resJson.error || 'Failed to generate fee dues.');
      }
    } catch (err) {
      console.error('Error making dues:', err);
      showFeedback('error', 'Network error occurred while generating student dues.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSections = meta.sections.filter(
    (sec) => String(sec.class_id) === String(formData.class_id)
  );

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-10">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <FiCheckCircle className="text-emerald-600 text-lg" />
            ) : (
              <FiAlertCircle className="text-rose-600 text-lg" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <FiX />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
          <FiSend /> Batch Billing Dispatch
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Make Due Education Fees
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Dispatch monthly or term fee dues in batch for all enrolled students of a selected class. Once made due, invoices immediately reflect in the Student Portal for online payment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiDollarSign className="text-indigo-600" /> Due Billing Configuration
          </h2>

          <form onSubmit={handleMakeDueSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Academic Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">Select Academic Class</option>
                  {meta.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Class Section (Optional)
                </label>
                <select
                  value={formData.section_id}
                  onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Sections (Entire Class)</option>
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Configured Education Fee <span className="text-rose-500">*</span>
                </label>
                {loadingFees ? (
                  <div className="text-xs text-slate-400 py-2.5">Loading fees for selected class...</div>
                ) : classFees.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <FiAlertCircle className="shrink-0" />
                    <span>No active fees configured for this class. Go to "Configure Fees" to create one.</span>
                  </div>
                ) : (
                  <select
                    value={formData.education_fee_id}
                    onChange={(e) => handleFeeSelect(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    {classFees.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fee_title} (৳{parseFloat(f.amount).toFixed(2)} - {f.frequency})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Billing Month / Cycle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 2026, Term 1"
                  value={formData.month_name}
                  onChange={(e) => setFormData({ ...formData, month_name: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Due Amount (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={formData.custom_amount}
                  onChange={(e) => setFormData({ ...formData, custom_amount: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Late Fine (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.fine_amount}
                  onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Dispatch Remarks / Invoice Notes
              </label>
              <textarea
                rows="2"
                placeholder="Optional notes printed on the student fee bill..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || classFees.length === 0 || (previewData?.eligibleStudentsCount || 0) === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend className="text-base" />
                {submitting
                  ? 'Generating Invoices...'
                  : `Make Due Fees for ${previewData?.eligibleStudentsCount || 0} Students`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Preview Column (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiUsers className="text-indigo-600" /> Eligibility Preview
            </h3>

            {previewLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400">Inspecting student enrollments...</p>
              </div>
            ) : previewData ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                    Total Enrolled Students
                  </span>
                  <span className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 font-mono">
                    {previewData.totalStudents}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                    Already Due for This Month
                  </span>
                  <span className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 font-mono">
                    {previewData.existingDuesCount}
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    Will be skipped to prevent double-billing.
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                    Ready to Generate
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
                    {previewData.eligibleStudentsCount}
                  </span>
                </div>

                {previewData.sampleStudents && previewData.sampleStudents.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sample Candidates:</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {previewData.sampleStudents.map((st) => (
                        <div
                          key={st.id}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {st.name || 'Student'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Reg: {st.registration_no}</span>
                          </div>
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Roll {st.roll_no || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Select a class to preview student counts.</p>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs flex items-start gap-2">
            <FiInfo className="text-indigo-600 mt-0.5 shrink-0" />
            <span>
              Unique invoice numbers are automatically assigned. Students can immediately view dues and pay from their portal.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

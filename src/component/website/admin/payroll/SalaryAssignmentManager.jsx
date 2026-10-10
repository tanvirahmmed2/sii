'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export default function SalaryAssignmentManager({ roleType = 'teacher', title, subtitle }) {
  const isTeacher = roleType === 'teacher';

  const salariesApi = isTeacher ? '/api/staff/panel/teacher-salaries' : '/api/staff/panel/officer-salaries';
  const payrollsApi = isTeacher ? '/api/staff/panel/teacher-payrolls' : '/api/staff/panel/officer-payrolls';

  const defaultTitle = isTeacher ? 'Teacher Salary Assignments' : 'Officer Salary Assignments';
  const defaultSubtitle = isTeacher
    ? 'Map institutional payroll scales and grade structures to academic teaching staff.'
    : 'Map institutional payroll scales and grade structures to administrative officers.';

  const [personnel, setPersonnel] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'assigned', 'unassigned', 'active', 'inactive'
  const [feedback, setFeedback] = useState(null);

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedPayrollId, setSelectedPayrollId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentStatus, setAssignmentStatus] = useState('active');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const [personnelRes, payrollsRes] = await Promise.all([
        fetch(`${salariesApi}?${params.toString()}`),
        fetch(payrollsApi),
      ]);

      const [personnelData, payrollsData] = await Promise.all([
        personnelRes.json(),
        payrollsRes.json(),
      ]);

      if (personnelData.success) {
        setPersonnel(isTeacher ? personnelData.teachers || [] : personnelData.officers || []);
      }
      if (payrollsData.success) {
        setPayrolls(payrollsData.payrolls || []);
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to load roster and payroll scales.' });
    } finally {
      setLoading(false);
    }
  }, [salariesApi, payrollsApi, searchTerm, statusFilter, isTeacher]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAssignModal = (person) => {
    setSelectedPerson(person);
    setSelectedPayrollId(person.payroll_id ? String(person.payroll_id) : (payrolls[0]?.id ? String(payrolls[0].id) : ''));
    setEffectiveDate(person.effective_date ? String(person.effective_date).slice(0, 10) : new Date().toISOString().split('T')[0]);
    setAssignmentStatus(person.salary_status || 'active');
    setRemarks(person.remarks || '');
    setAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedPerson || !selectedPayrollId) return;

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        teacher_id: isTeacher ? selectedPerson.teacher_id : undefined,
        officer_id: !isTeacher ? selectedPerson.officer_id : undefined,
        payroll_id: selectedPayrollId,
        effective_date: effectiveDate,
        status: assignmentStatus,
        remarks: remarks,
      };

      const res = await fetch(salariesApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setAssignModalOpen(false);
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to assign payroll scale.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error saving assignment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (person) => {
    const personId = isTeacher ? person.teacher_id : person.officer_id;
    const name = isTeacher ? person.teacher_name : person.officer_name;

    if (!window.confirm(`Unassign payroll scale from ${name}? Their monthly salary record will be disconnected.`)) {
      return;
    }

    try {
      const url = `${salariesApi}?${isTeacher ? `teacher_id=${personId}` : `officer_id=${personId}`}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to unassign.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error unassigning staff.' });
    }
  };

  // Preview of currently selected scale inside modal
  const selectedPayrollPreview = useMemo(() => {
    if (!selectedPayrollId) return null;
    return payrolls.find((p) => String(p.id) === String(selectedPayrollId));
  }, [payrolls, selectedPayrollId]);

  // Metrics
  const metrics = useMemo(() => {
    const total = personnel.length;
    const assigned = personnel.filter((p) => p.salary_id).length;
    const unassigned = total - assigned;
    const totalMonthlyCommitment = personnel.reduce((acc, p) => acc + (parseFloat(p.net_salary) || 0), 0);
    return { total, assigned, unassigned, totalMonthlyCommitment };
  }, [personnel]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {title || defaultTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle || defaultSubtitle}
          </p>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="font-semibold text-slate-500 hover:text-slate-700 ml-2">
              ×
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total {isTeacher ? 'Teachers' : 'Officers'}</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Assigned to Scale</p>
          <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{metrics.assigned}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Unassigned</p>
          <p className="text-lg font-semibold font-mono text-amber-600 dark:text-amber-400 mt-1">{metrics.unassigned}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Monthly Commitment</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">
            ৳{metrics.totalMonthlyCommitment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${isTeacher ? 'teacher' : 'officer'} by name, email, phone...`}
            className="w-full max-w-sm text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Records</option>
            <option value="assigned">Assigned Only</option>
            <option value="unassigned">Unassigned Only</option>
            <option value="active">Active Assignment</option>
            <option value="inactive">Inactive Assignment</option>
          </select>
        </div>
        <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
          {personnel.length} record{personnel.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table of Roster & Assignments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-x-auto shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <th className="py-2.5 px-3">Personnel</th>
              <th className="py-2.5 px-3">{isTeacher ? 'Designation' : 'Department'}</th>
              <th className="py-2.5 px-3">Assigned Scale</th>
              <th className="py-2.5 px-3 font-mono text-right">Basic</th>
              <th className="py-2.5 px-3 font-mono text-right">Gross</th>
              <th className="py-2.5 px-3 font-mono text-right">Deductions</th>
              <th className="py-2.5 px-3 font-mono text-right">Net Payable</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Loading roster and salary records...
                </td>
              </tr>
            ) : personnel.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No records found matching filters.
                </td>
              </tr>
            ) : (
              personnel.map((person) => {
                const id = isTeacher ? person.teacher_id : person.officer_id;
                const name = isTeacher ? person.teacher_name : person.officer_name;
                const email = isTeacher ? person.teacher_email : person.officer_email;
                const phone = isTeacher ? person.teacher_phone : person.officer_phone;
                const roleDesc = isTeacher ? (person.designation_name || 'Teacher') : (`${person.department || 'General'} • ${person.designation || 'Officer'}`);
                const isAssigned = Boolean(person.salary_id);

                return (
                  <tr key={id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{email} • {phone}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {roleDesc}
                    </td>
                    <td className="py-2.5 px-3">
                      {isAssigned ? (
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white">{person.payroll_title}</span>
                          {person.grade_code && (
                            <span className="ml-1 text-[10px] font-mono text-slate-400">({person.grade_code})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                          Not Assigned
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right">
                      {isAssigned ? `৳${Number(person.basic_salary).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-700 dark:text-slate-200">
                      {isAssigned ? `৳${Number(person.gross_salary).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-rose-600 dark:text-rose-400">
                      {isAssigned ? `-৳${Number(person.total_deductions).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {isAssigned ? `৳${Number(person.net_salary).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isAssigned ? (
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            person.salary_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {person.salary_status}
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openAssignModal(person)}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                          isAssigned
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200'
                            : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {isAssigned ? 'Change Scale' : 'Assign Scale'}
                      </button>
                      {isAssigned && (
                        <button
                          onClick={() => handleUnassign(person)}
                          className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                        >
                          Unassign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Assign Payroll Scale: {isTeacher ? selectedPerson.teacher_name : selectedPerson.officer_name}
              </h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-4 space-y-4 text-xs">
              {/* Personnel summary pill */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="block font-semibold text-slate-900 dark:text-white">
                  {isTeacher ? selectedPerson.teacher_name : selectedPerson.officer_name}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {isTeacher ? (selectedPerson.designation_name || 'Teacher') : (`${selectedPerson.department} • ${selectedPerson.designation}`)} • {isTeacher ? selectedPerson.teacher_email : selectedPerson.officer_email}
                </span>
              </div>

              {/* Select Payroll Scale */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Payroll Scale *
                </label>
                {payrolls.length === 0 ? (
                  <p className="text-rose-500 text-[11px]">
                    No payroll scales available. Please create scales first in the Payroll section.
                  </p>
                ) : (
                  <select
                    required
                    value={selectedPayrollId}
                    onChange={(e) => setSelectedPayrollId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Choose a Scale --</option>
                    {payrolls.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.grade_code ? `(${p.grade_code})` : ''} — Net: ৳{Number(p.net_salary).toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Live Preview of Selected Scale */}
              {selectedPayrollPreview && (
                <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span>Scale Breakdown Preview</span>
                    <span className="font-mono text-emerald-600">Net: ৳{Number(selectedPayrollPreview.net_salary).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <div>Basic: ৳{Number(selectedPayrollPreview.basic_salary).toLocaleString()}</div>
                    <div>Gross: ৳{Number(selectedPayrollPreview.gross_salary).toLocaleString()}</div>
                    <div>House Rent: ৳{Number(selectedPayrollPreview.house_rent).toLocaleString()}</div>
                    <div>Deductions: -৳{Number(selectedPayrollPreview.total_deductions).toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* Status & Effective Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Status
                  </label>
                  <select
                    value={assignmentStatus}
                    onChange={(e) => setAssignmentStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional assignment reference or notes..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedPayrollId}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                >
                  {saving ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

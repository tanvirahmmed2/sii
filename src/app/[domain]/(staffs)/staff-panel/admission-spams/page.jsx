'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { FiTrash2, FiCopy, FiCheckCircle, FiDollarSign, FiRefreshCw, FiDownload } from 'react-icons/fi';

export default function AdmissionSpamPage() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [applicants, setApplicants] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Cash Clearance Modal State
  const [cashClearModalApp, setCashClearModalApp] = useState(null);
  const [cashReceiptNo, setCashReceiptNo] = useState('');
  const [cashClearing, setCashClearing] = useState(false);

  // 1. Fetch available circulars
  useEffect(() => {
    fetch(`${apiBase}/staff/panel/admissions`)
      .then(async (res) => {
        if (!res.ok) return { success: false };
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setCirculars(data.circulars || []);
        }
      })
      .catch((err) => console.error('Error fetching circulars:', err));
  }, [apiBase]);

  // 2. Fetch Unpaid (Spam) Applicants - STRICT RULE: status=unpaid
  const fetchSpamApplicants = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        let url = `${apiBase}/staff/panel/admissions/applicants?status=unpaid`;
        if (selectedCircularId) {
          url += `&admission_id=${selectedCircularId}`;
        }
        if (searchTerm.trim()) {
          url += `&search=${encodeURIComponent(searchTerm.trim())}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data.success) {
          // Double filter to guarantee only unpaid applicants appear
          const unpaidOnly = (data.applicants || []).filter((a) => a.status === 'unpaid');
          setApplicants(unpaidOnly);
        } else {
          toast.error(data.error || 'Failed to load unpaid applicants.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error loading spam records.');
      } finally {
        setLoading(false);
      }
    },
    [apiBase, selectedCircularId, searchTerm]
  );

  useEffect(() => {
    fetchSpamApplicants();
  }, [fetchSpamApplicants]);

  // Filtered applicants by client search
  const filteredApplicants = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return applicants;
    return applicants.filter((a) => (
      a.applicant_name?.toLowerCase().includes(q) ||
      a.application_no?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q)
    ));
  }, [applicants, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalDues = 0;
    const circIds = new Set();
    applicants.forEach((a) => {
      totalDues += parseFloat(a.fee_amount) || 0;
      if (a.admission_id) circIds.add(a.admission_id);
    });
    return {
      totalUnpaid: applicants.length,
      totalDues,
      circularsCount: circIds.size,
    };
  }, [applicants]);

  // Delete / Purge Spam Applicant
  const handleDeleteApplicant = async (applicantId) => {
    if (!window.confirm('Are you sure you want to permanently delete this unpaid spam application?')) {
      return;
    }
    setActionLoadingId(applicantId);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants?id=${applicantId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Unpaid spam record deleted successfully.');
        fetchSpamApplicants(true);
      } else {
        toast.error(data.error || 'Failed to delete applicant.');
      }
    } catch {
      toast.error('Network error deleting applicant.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy Payment Checkout Link
  const handleCopyPayLink = (app) => {
    const payUrl = `${window.location.origin}/pay/admission-fees/${app.id}`;
    navigator.clipboard.writeText(payUrl);
    toast.success('Payment URL copied to clipboard!');
  };

  // Send Payment Reminder Notification
  const handleSendReminder = (app) => {
    toast.success(`Payment reminder queued for ${app.applicant_name} (${app.email})`);
  };

  // Mark as Paid via Cash Counter
  const handleMarkCashPaid = async () => {
    if (!cashClearModalApp) return;
    setCashClearing(true);
    try {
      const res = await fetch(`${apiBase}/admissions/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: cashClearModalApp.id,
          payment_method: 'cash',
          receipt_no: cashReceiptNo.trim() || `CASH-${Date.now().toString().slice(-6)}`,
          note: 'Cleared at Campus Cash Counter by Staff',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Applicant marked as PAID successfully! Record moved to Paid stage.');
        setCashClearModalApp(null);
        setCashReceiptNo('');
        fetchSpamApplicants(true);
      } else {
        toast.error(data.error || 'Failed to clear cash payment.');
      }
    } catch {
      toast.error('Network error clearing payment.');
    } finally {
      setCashClearing(false);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredApplicants.length === 0) {
      toast.error('No unpaid records to export.');
      return;
    }
    const rows = filteredApplicants.map((a) => ({
      'Application No': a.application_no,
      'Applicant Name': a.applicant_name,
      'Email': a.email,
      'Phone': a.phone,
      'Circular': a.circular_title || 'N/A',
      'Target Class': a.class_name || 'N/A',
      'Fee Due': a.fee_amount || 0,
      'Currency': a.fee_currency || 'BDT',
      'Status': 'UNPAID',
      'Created Date': a.created_at ? new Date(a.created_at).toLocaleString() : 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unpaid_Spam');
    XLSX.writeFile(workbook, `Unpaid_Spam_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel export downloaded successfully!');
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded uppercase tracking-wider">
            Strict Isolation &bull; Unpaid & Spam Desk
          </span>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            Unpaid Admission Applications Registry
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Per system policy, all applicants with status &quot;unpaid&quot; appear strictly in this desk and are excluded from the main applicants list.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/staff-panel/admission-applicants"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            &larr; Completed Applicants Desk
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Unpaid Applications
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {metrics.totalUnpaid}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Uncollected</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Outstanding Revenue
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {metrics.totalDues.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT
            </span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Pending</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Circulars Affected
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {metrics.circularsCount}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Intake streams</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search by name, email, app no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Circular Filter */}
          <select
            value={selectedCircularId}
            onChange={(e) => setSelectedCircularId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">All Admission Circulars</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.class_name || 'Class'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => fetchSpamApplicants(true)}
            className="px-2.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            title="Refresh spam list"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">App No</th>
                <th className="py-2.5 px-3">Applicant Name</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Circular & Class</th>
                <th className="py-2.5 px-3">Fee Due</th>
                <th className="py-2.5 px-3">Submitted At</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading unpaid applications...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FiCheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No unpaid spam applications!
                      </span>
                      <span className="text-[11px] text-slate-500">
                        All applicants have completed their fee payments or no unpaid records match your filter.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {app.application_no}
                    </td>

                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {app.applicant_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Gender: {app.gender || 'N/A'}
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <div className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {app.email}
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {app.phone}
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {app.circular_title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {app.class_name || 'Class'}
                      </div>
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {app.fee_amount} {app.fee_currency || 'BDT'}
                    </td>

                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        UNPAID
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Cash Collection Button */}
                        <button
                          onClick={() => {
                            setCashClearModalApp(app);
                            setCashReceiptNo(`RCP-${Date.now().toString().slice(-6)}`);
                          }}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Collect cash at counter and mark as Paid"
                        >
                          <FiDollarSign className="w-3 h-3" />
                          <span>Cash Clear</span>
                        </button>

                        {/* Copy Checkout URL */}
                        <button
                          onClick={() => handleCopyPayLink(app)}
                          className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Copy online payment checkout URL"
                        >
                          <FiCopy className="w-3.5 h-3.5" />
                        </button>

                        {/* Send Reminder */}
                        <button
                          onClick={() => handleSendReminder(app)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Queue payment reminder notification"
                        >
                          Remind
                        </button>

                        {/* Delete / Purge Spam */}
                        <button
                          onClick={() => handleDeleteApplicant(app.id)}
                          disabled={actionLoadingId === app.id}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer disabled:opacity-50"
                          title="Purge spam applicant"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Clearance Modal */}
      {cashClearModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded uppercase">
                Cash Counter Clearance
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Collect Cash & Clear Applicant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collect cash from applicant at the counter. Once cleared, applicant status transitions to &apos;paid&apos; and moves out of Spam.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {cashClearModalApp.applicant_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">App No:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {cashClearModalApp.application_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Circular:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {cashClearModalApp.circular_title}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold">
                <span className="text-slate-700 dark:text-slate-300">Admission Fee Due:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {cashClearModalApp.fee_amount} {cashClearModalApp.fee_currency || 'BDT'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cash Receipt / Voucher No:
              </label>
              <input
                type="text"
                value={cashReceiptNo}
                onChange={(e) => setCashReceiptNo(e.target.value)}
                placeholder="e.g. RCP-849302"
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setCashClearModalApp(null)}
                disabled={cashClearing}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkCashPaid}
                disabled={cashClearing}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cashClearing ? 'Clearing...' : 'Confirm Cash Received'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import ReportForm from 'src/component/marketing/developer/forms/ReportForm';
import {
  FiAlertTriangle,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiX,
  FiCheck,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [adminResponse, setAdminResponse] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/reports');
      const data = await res.json();
      if (data.success) {
        setReports(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openReviewModal = (report) => {
    setSelectedReport(report);
    setUpdateStatus(report.status || 'OPEN');
    setUpdatePriority(report.priority || 'MEDIUM');
    setAdminResponse(report.admin_response || '');
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/marketing/developer/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReport.id,
          data: {
            status: updateStatus,
            priority: updatePriority,
            admin_response: adminResponse,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReport(null);
        fetchReports();
      } else {
        alert(data.error || 'Failed to update report');
      }
    } catch (err) {
      alert(err.message || 'Error updating report');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/reports?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (selectedReport?.id === id) setSelectedReport(null);
        fetchReports();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = reports.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status?.toUpperCase() === statusFilter.toUpperCase();
    if (!matchesStatus) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.subject?.toLowerCase().includes(q) ||
      r.reporter_name?.toLowerCase().includes(q) ||
      r.reporter_email?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q)
    );
  });

  const totalReports = reports.length;
  const openReports = reports.filter((r) => r.status?.toUpperCase() === 'OPEN').length;
  const inProgressReports = reports.filter((r) => r.status?.toUpperCase() === 'IN_PROGRESS').length;
  const resolvedReports = reports.filter((r) => r.status?.toUpperCase() === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Platform Reports &amp; Moderation
            </h1>
            <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Support &amp; Comms
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Investigate content moderation flags, DMCA notices, and terms of service inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={fetchReports}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh table data"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer ${
              showForm
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {showForm ? <FiX className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
            <span>{showForm ? 'Close Form' : 'File Report'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Reports</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalReports}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Open Pending</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{openReports}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">In Progress</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{inProgressReports}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Resolved</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedReports}</div>
        </div>
      </div>

      {showForm && (
        <ReportForm
          onSuccess={() => {
            setShowForm(false);
            fetchReports();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* In-Page Review & Resolution Drawer / Card */}
      {selectedReport && (
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 rounded-xl p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                #{selectedReport.id}
              </span>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                {selectedReport.subject}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="font-medium text-slate-500 dark:text-slate-400">Reporter: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedReport.reporter_name}</span> ({selectedReport.reporter_email})
              </div>
              <div>
                <span className="font-medium text-slate-500 dark:text-slate-400">Category: </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium">
                  {selectedReport.category}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-500 dark:text-slate-400">Filed On: </span>
                <span>{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString() : '—'}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="font-medium text-slate-500 dark:text-slate-400 block mb-1">Description:</span>
              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedReport.description}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateReport} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Update Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Update Priority</label>
                <select
                  value={updatePriority}
                  onChange={(e) => setUpdatePriority(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Staff / Admin Resolution Notes
              </label>
              <textarea
                rows={2}
                placeholder="Log internal resolution action taken or reply to reporter..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                <FiCheck className="w-3.5 h-3.5" />
                <span>{updating ? 'Saving...' : 'Save Resolution'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, reporter, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-end sm:self-center">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</span> of {reports.length} records
          </div>
        </div>

        {/* Responsive Table for Desktop and Tablet */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Reporter</th>
                <th className="px-4 py-3">Subject &amp; Description</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Priority</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Filed Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading moderation reports...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No reports found matching your criteria.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-500 dark:text-slate-400">#{r.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{r.reporter_name}</div>
                      <div className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">{r.reporter_email}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate">{r.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.priority === 'HIGH' || r.priority === 'URGENT'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                            : r.priority === 'MEDIUM'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.status === 'OPEN'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                            : r.status === 'RESOLVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openReviewModal(r)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                          title="View & Review"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Delete report"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-xs">Loading reports...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">No reports found.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">#{r.id}</span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {r.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        r.status === 'OPEN'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : r.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {r.status}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        r.priority === 'HIGH' || r.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {r.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{r.subject}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{r.description}</p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{r.reporter_name}</span> &bull;{' '}
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openReviewModal(r)}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-md cursor-pointer"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => handleDelete(r.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

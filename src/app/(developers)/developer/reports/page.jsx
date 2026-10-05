'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import ReportForm from 'src/component/marketing/developer/forms/ReportForm';
import { Context } from 'src/component/helper/Context';

export default function AdminReportsPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('reports') || ['admin', 'manager', 'developer'].includes((user?.role || '').toLowerCase());
  const canDelete = permissions.includes('reports') || ['admin', 'manager'].includes((user?.role || '').toLowerCase());

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
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const fetchReports = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/reports');
      const data = await res.json();
      if (data.success) {
        setReports(data.records || []);
      } else {
        notify(data.error || 'Failed to fetch reports.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error fetching reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(true);
  }, [fetchReports]);

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
        notify(`Report #${selectedReport.id} updated successfully.`);
        fetchReports(false);
      } else {
        notify(data.error || 'Failed to update report', 'error');
      }
    } catch (err) {
      notify(err.message || 'Error updating report', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      notify('Permission denied: delete permission required.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this report?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/reports?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (selectedReport?.id === id) setSelectedReport(null);
        notify('Report deleted successfully.');
        fetchReports(false);
      } else if (data.error) {
        notify(data.error, 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error deleting report.', 'error');
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
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-medium transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Platform Reports &amp; Moderation
            </h1>
            <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              Support &amp; Comms
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Investigate content moderation flags, DMCA notices, and terms of service inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => fetchReports(true)}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {showForm ? 'Close Form' : 'File Report'}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Total Reports</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{totalReports}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Open Pending</div>
          <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{openReports}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">In Progress</div>
          <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{inProgressReports}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Resolved</div>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{resolvedReports}</div>
        </div>
      </div>

      {showForm && (
        <ReportForm
          onSuccess={(record) => {
            setShowForm(false);
            notify(`Moderation report #${record?.id || ''} filed successfully.`);
            fetchReports(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* In-Page Review & Resolution Drawer / Card */}
      {selectedReport && (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                #{selectedReport.id}
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {selectedReport.subject}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-medium text-slate-500">Reporter: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedReport.reporter_name}</span> ({selectedReport.reporter_email})
              </div>
              <div>
                <span className="font-medium text-slate-500">Category: </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-medium">
                  {selectedReport.category}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Filed On: </span>
                <span>{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString() : '—'}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-800">
              <span className="font-medium text-slate-500 block mb-1">Description:</span>
              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedReport.description}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateReport} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Update Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Update Priority</label>
                <select
                  value={updatePriority}
                  onChange={(e) => setUpdatePriority(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Staff / Admin Resolution Notes
              </label>
              <textarea
                rows={2}
                placeholder="Log internal resolution action taken or reply to reporter..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search subject, reporter, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800"
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

        {/* Responsive Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <th className="px-4 py-2.5 whitespace-nowrap">ID</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Reporter</th>
                <th className="px-4 py-2.5">Subject &amp; Description</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Priority</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Filed Date</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-normal">
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
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-500 dark:text-slate-400">#{r.id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{r.reporter_name}</div>
                      <div className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">{r.reporter_email}</div>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate">{r.description}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase border ${
                          r.priority === 'HIGH' || r.priority === 'URGENT'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900'
                            : r.priority === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase border ${
                          r.status === 'OPEN'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900'
                            : r.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openReviewModal(r)}
                          className="text-slate-800 dark:text-slate-200 hover:underline font-medium text-xs cursor-pointer"
                        >
                          Review
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={() => handleDelete(r.id)}
                            className="text-rose-600 hover:text-rose-800 font-medium text-xs cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
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
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-500">#{r.id}</span>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {r.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                        r.status === 'OPEN'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : r.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {r.status}
                    </span>
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                        r.priority === 'HIGH' || r.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
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
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{r.reporter_name}</span> •{' '}
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openReviewModal(r)}
                      className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:underline cursor-pointer"
                    >
                      Review
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
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

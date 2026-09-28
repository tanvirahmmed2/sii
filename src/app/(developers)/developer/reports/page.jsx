'use client';

import { useState, useEffect } from 'react';
import { BiSearch, BiPlus, BiMinus, BiTrash, BiRefresh } from 'react-icons/bi';
import ReportForm from '@/components/developer/forms/ReportForm';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/reports');
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/developer/reports?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
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
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.subject?.toLowerCase().includes(q) ||
      r.reporter_name?.toLowerCase().includes(q) ||
      r.reporter_email?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Reports &amp; Moderation</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Report
            </span>
          </div>
          <p className="text-xs text-slate-500">Resolve content moderation tickets, DMCA notices, and terms of service inquiries.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh table data"
          >
            <BiRefresh className="text-lg" />
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              showForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-secondary hover:bg-secondary-dark text-white'
            }`}
          >
            {showForm ? <BiMinus className="text-base" /> : <BiPlus className="text-base" />}
            <span>{showForm ? 'Hide Form' : 'Add Report'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <ReportForm
          apiEndpoint="/api/developer/reports"
          onSuccess={() => {
            setShowForm(false);
            fetchReports();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search reports by subject, reporter, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {reports.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Reporter</th>
                <th className="px-4 py-3 whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Priority</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Filed Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading reports...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No reports found.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">#{r.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.reporter_name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{r.reporter_email}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">{r.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate">{r.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.priority === 'HIGH' || r.priority === 'URGENT'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : r.priority === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'OPEN'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : r.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <BiTrash className="text-base" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import LeadForm from 'src/component/marketing/developer/forms/LeadForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sales lead?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/leads?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = leads.filter((l) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Sales &amp; Growth Leads</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Leads
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Inbound prospect inquiries, enterprise evaluations, and high-value sales opportunities.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLeads}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              showForm
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
            }`}
          >
            {showForm ? 'Hide Form' : 'Add Lead'}
          </button>
        </div>
      </div>

      {showForm && (
        <LeadForm
          apiEndpoint="/api/marketing/developer/leads"
          onSuccess={() => {
            setShowForm(false);
            fetchLeads();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search leads by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {leads.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Prospect Name</th>
                <th className="pb-2 whitespace-nowrap">Contact Info</th>
                <th className="pb-2 whitespace-nowrap">Company</th>
                <th className="pb-2 whitespace-nowrap">Source</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Captured Date</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading leads..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">No sales leads found.</td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-mono font-medium text-slate-400">#{l.id}</td>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{l.name}</td>
                    <td className="py-2.5">
                      <div className="font-mono text-slate-700 dark:text-slate-300">{l.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{l.phone || '—'}</div>
                    </td>
                    <td className="py-2.5 font-normal text-slate-700 dark:text-slate-300">{l.company || '—'}</td>
                    <td className="py-2.5 text-slate-500 text-[11px]">{l.source || 'WEBSITE'}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                        l.status === 'QUALIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : l.status === 'CONTACTED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : l.status === 'NEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={deletingId === l.id}
                        onClick={() => handleDelete(l.id)}
                        className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Delete
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

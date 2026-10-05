'use client';

import { useState, useEffect } from 'react';
import WebsiteForm from 'src/component/marketing/developer/forms/WebsiteForm';

export default function AdminWebsitesPage() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/websites');
      const data = await res.json();
      if (data.success) {
        setWebsites(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this website container?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/websites?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchWebsites();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = websites.filter((w) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      w.name?.toLowerCase().includes(q) ||
      w.subdomain?.toLowerCase().includes(q) ||
      w.custom_domain?.toLowerCase().includes(q) ||
      String(w.creator_id).includes(q)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Hosted Websites</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Websites
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Containers, custom domains, storage allocation, and published status.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWebsites}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer transition-colors"
          >
            {showForm ? 'Hide Form' : 'Add Website'}
          </button>
        </div>
      </div>

      {showForm && (
        <WebsiteForm
          onSuccess={() => {
            setShowForm(false);
            fetchWebsites();
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
              placeholder="Search websites by name, subdomain, or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800 font-normal"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {websites.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Website Name</th>
                <th className="pb-2 whitespace-nowrap">Subdomain</th>
                <th className="pb-2 whitespace-nowrap">Custom Domain</th>
                <th className="pb-2 whitespace-nowrap">Storage</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Published</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">Loading websites...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">No websites found.</td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-mono text-slate-400 font-medium">#{w.id}</td>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{w.name}</td>
                    <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{w.subdomain || '—'}</td>
                    <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{w.custom_domain || '—'}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400 font-mono">{w.storage_used_mb ?? 0} MB</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.2 rounded border text-[9px] font-medium border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {w.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                        w.is_published
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {w.is_published ? 'Online' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={deletingId === w.id}
                        onClick={() => handleDelete(w.id)}
                        className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deletingId === w.id ? 'Deleting...' : 'Delete'}
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

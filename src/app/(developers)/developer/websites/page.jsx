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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <h1 className="text-base font-medium text-slate-900 dark:text-white">Hosted Websites</h1>
          <p className="text-xs text-slate-500 font-normal">Containers, custom domains, storage allocation, and published status.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWebsites}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <input
            type="text"
            placeholder="Search websites by name, subdomain, or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 font-normal"
          />
          <div className="text-xs text-slate-500 font-normal">
            Showing {filtered.length} of {websites.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal text-[11px]">
                <th className="px-3.5 py-2.5 whitespace-nowrap">ID</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Website Name</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Subdomain</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Custom Domain</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Storage</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Published</th>
                <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-normal">Loading websites...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-normal">No websites found.</td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-slate-500 font-normal">#{w.id}</td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">{w.name}</td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-400 font-normal">{w.subdomain || '—'}</td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-400 font-normal">{w.custom_domain || '—'}</td>
                    <td className="px-3.5 py-2.5 font-normal text-slate-600 dark:text-slate-400">{w.storage_used_mb ?? 0} MB</td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-normal border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {w.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-normal">
                      <span className={w.is_published ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>
                        {w.is_published ? 'Online' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={deletingId === w.id}
                        onClick={() => handleDelete(w.id)}
                        className="text-xs font-normal text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50 cursor-pointer"
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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanToggle = async (userId, currentBanned) => {
    try {
      await fetch('/api/marketing/developer/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isBanned: !currentBanned }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Permanently remove this user account?')) return;
    try {
      await fetch(`/api/marketing/developer/users?id=${userId}`, {
        method: 'DELETE',
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500">
            <Link href="/developer" className="hover:underline">Developer Overview</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">End-Users</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Registered End-Users Directory</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Audience
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visitors who leave verified reviews on portfolio websites and participate in blog discussions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">User</th>
                <th className="pb-2 whitespace-nowrap">Activity Metrics</th>
                <th className="pb-2 whitespace-nowrap">Account Status</th>
                <th className="pb-2 whitespace-nowrap">Registered</th>
                <th className="pb-2 text-right whitespace-nowrap">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-normal">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No registered user accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-2.5">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{u.reviewsCount || 0} Reviews</span>
                        <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{u.commentsCount || 0} Comments</span>
                      </div>
                    </td>

                    <td className="py-2.5">
                      {u.isBanned ? (
                        <span className="px-1.5 py-0.2 rounded border text-[9px] font-medium uppercase bg-rose-50 text-rose-700 border-rose-200">
                          Banned
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded border text-[9px] font-medium uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                    </td>

                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleBanToggle(u.id, u.isBanned)}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                            u.isBanned
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Delete
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
    </div>
  );
}

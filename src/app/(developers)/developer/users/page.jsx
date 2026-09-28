'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UsersIcon, StarIcon, MessageSquareIcon, CheckCircleIcon } from '@/components/ui/Icons';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/users');
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
      await fetch('/api/developer/users', {
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
      await fetch(`/api/developer/users?id=${userId}`, {
        method: 'DELETE',
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-rose-400">
          <Link href="/developer" className="hover:underline">← Developer Overview</Link>
          <span>/</span>
          <span>End-Users</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-rose-500" />
          <span>Registered End-Users Directory</span>
        </h1>
        <p className="text-xs text-slate-400">
          Visitors who leave verified reviews on portfolio websites and participate in blog discussions.
        </p>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase text-[10px] text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 font-semibold">User</th>
                <th className="py-3.5 px-4 font-semibold">Activity Metrics</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold">Registered</th>
                <th className="py-3.5 px-4 font-semibold text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    No registered user accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                        <div>
                          <span className="font-bold text-white block">{u.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-amber-400">
                          <StarIcon filled className="w-3 h-3" />
                          <span>{u.reviewsCount || 0} Reviews</span>
                        </span>
                        <span className="flex items-center gap-1 text-indigo-400">
                          <MessageSquareIcon className="w-3 h-3" />
                          <span>{u.commentsCount || 0} Comments</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isBanned ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          BANNED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <CheckCircleIcon className="w-3 h-3" />
                          ACTIVE
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleBanToggle(u.id, u.isBanned)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            u.isBanned
                              ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                              : 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                          }`}
                        >
                          {u.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
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

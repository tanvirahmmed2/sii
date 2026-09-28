'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Context } from '@/components/helper/Context';
import {
  BiSearch,
  BiPlus,
  BiEdit,
  BiTrash,
  BiRefresh,
  BiBell,
  BiLoaderAlt,
  BiShieldQuarter,
  BiCalendar,
  BiLinkExternal,
  BiLockAlt,
  BiX,
} from 'react-icons/bi';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
}

export default function DeveloperUpdatesPage() {
  const { user } = useContext(Context);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [creating, setCreating] = useState(false);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('updates');
  const router = useRouter();

  const handleCreateDefaultUpdate = async () => {
    if (!canManage || creating) return;
    try {
      setCreating(true);
      const res = await fetch('/api/developer/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Update',
          description: '<p>Details about this update...</p>',
        }),
      });
      const data = await res.json();
      if (data.success && data.record?.slug) {
        router.push(`/developer/updates/${data.record.slug}`);
      } else {
        alert(data.error || 'Failed to create update.');
        setCreating(false);
      }
    } catch (e) {
      alert(e.message || 'Error creating update.');
      setCreating(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/updates');
      const data = await res.json();
      if (data.success) {
        setUpdates(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/developer/updates')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setUpdates(data.records || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to fetch updates:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id, title) => {
    if (!canManage) {
      alert('Access denied: updates permission required.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${title || 'this update'}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`/api/developer/updates?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setUpdates((prev) => prev.filter((u) => u.id !== id));
      } else {
        alert(data.error || 'Failed to delete update');
      }
    } catch (err) {
      console.error('Error deleting update:', err);
      alert(err.message || 'Error deleting update');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUpdates = updates.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.title?.toLowerCase().includes(term) ||
      u.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Product Updates &amp; Changelog
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Changelog
            </span>
            {!canManage && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <BiLockAlt className="text-xs" />
                <span>Read-Only</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Publish, edit, and manage product feature releases, announcements, and changelogs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchUpdates}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh updates"
            aria-label="Refresh"
          >
            <BiRefresh className="text-lg" />
          </button>
          {canManage && (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateDefaultUpdate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer disabled:opacity-60 shrink-0"
              title="Post Update"
            >
              {creating ? <BiLoaderAlt className="animate-spin text-base" /> : <BiPlus className="text-base" />}
              <span>{creating ? 'Posting...' : 'Post Update'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission Warning if not admin or manager */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex items-center gap-2.5 text-xs">
          <BiShieldQuarter className="text-base text-amber-600 shrink-0" />
          <span>
            You are viewing updates in read-only mode. Only <strong>Admin</strong> and <strong>Manager</strong> accounts can post, edit, or delete updates.
          </span>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
        {/* Search & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search updates by title or content keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-bold text-slate-800">{filteredUpdates.length}</span> of {updates.length} updates
          </div>
        </div>

        {/* Responsive View List (Strictly zero horizontal overflow) */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-12 shrink-0">Type</span>
            <span className="flex-1 min-w-0">Update Title &amp; Release Notes</span>
            <span className="w-28 shrink-0 text-center hidden sm:block">Published</span>
            <span className="w-24 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading product changelog...</span>
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiBell />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Updates Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No updates matched "${searchTerm}". Try a different keyword.`
                  : 'Start posting product changelog and release notes.'}
              </p>
              {canManage && !searchTerm && (
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreateDefaultUpdate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2 disabled:opacity-60"
                >
                  <BiPlus />
                  <span>Post First Update</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filteredUpdates.map((item) => {
                const plainDescription = stripHtml(item.description);
                const formattedDate = item.created_at
                  ? new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={item.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{item.id}
                    </span>

                    {/* Icon Box */}
                    <div className="w-10 h-8 sm:w-12 sm:h-9 rounded-lg border border-secondary/20 bg-secondary/10 text-secondary shrink-0 relative flex items-center justify-center">
                      <BiBell className="text-sm sm:text-base" />
                    </div>

                    {/* Title & Details (min-w-0 flex-1 truncate) */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canManage ? (
                          <Link
                            href={`/developer/updates/${item.slug}`}
                            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight"
                            title={item.title}
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-bold text-slate-900 truncate block tracking-tight"
                            title={item.title}
                          >
                            {item.title}
                          </span>
                        )}
                      </div>

                      {plainDescription ? (
                        <p className="text-[11px] text-slate-500 truncate block leading-normal">
                          {plainDescription}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">No details added yet</span>
                      )}

                      {/* Small screen date */}
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-slate-400 sm:hidden">
                        <BiCalendar className="text-secondary shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Date Column (Tablet/Desktop) */}
                    <div className="w-28 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                      {item.slug && (
                        <Link
                          href={`/updates/${item.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-secondary hover:bg-slate-50 transition-colors"
                          title="View live changelog entry"
                        >
                          <BiLinkExternal className="text-sm" />
                        </Link>
                      )}

                      {canManage && (
                        <>
                          <Link
                            href={`/developer/updates/${item.slug}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-secondary hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit update"
                          >
                            <BiEdit className="text-sm" />
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete update"
                          >
                            {deletingId === item.id ? (
                              <BiLoaderAlt className="animate-spin text-sm" />
                            ) : (
                              <BiTrash className="text-sm" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

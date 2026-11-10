'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import NoticeEditor from 'src/component/marketing/developer/NoticeEditor';
import {
  FiBell,
  FiPlus,
  FiTrash2,
  FiBookmark,
  FiShield,
  FiArrowLeft,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiCalendar,
  FiUser,
  FiExternalLink
} from 'react-icons/fi';

export default function DeveloperNoticesPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1 || String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' || permissions.includes('*');
  const isAuthorized = isOwner || permissions.includes('notices') || permissions.includes('notice');

  const [notices, setNotices] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    category: 'GENERAL',
    is_pinned: false,
    target_role: 'ALL',
  });
  const [savingNotice, setSavingNotice] = useState(false);

  const fetchNotices = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/notices');
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices || []);
        setCanManage(Boolean(data.canManage));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchNotices();
    }
  }, [isAuthorized]);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      setSavingNotice(true);
      const res = await fetch('/api/marketing/developer/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreatePanel(false);
        setCreateForm({
          title: '',
          content: '',
          priority: 'NORMAL',
          category: 'GENERAL',
          is_pinned: false,
          target_role: 'ALL',
        });
        fetchNotices(false);
      } else {
        alert(data.error || 'Failed to post notice');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingNotice(false);
    }
  };

  const handleTogglePin = async (notice) => {
    try {
      const res = await fetch(`/api/marketing/developer/notices/${notice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !notice.is_pinned }),
      });
      const data = await res.json();
      if (data.success) {
        fetchNotices(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/notices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchNotices(false);
      } else {
        alert(data.error || 'Failed to delete notice');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (String(priority || '').toUpperCase()) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
      case 'NORMAL':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  if (!isAuthorized && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiShield />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">You require notices permissions to view company announcements.</p>
          <Link
            href="/developer/overview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Overview
          </Link>
        </div>
      </div>
    );
  }

  const filteredNotices = notices.filter((n) => {
    if (categoryFilter === 'ALL') return true;
    return String(n.category || '').toUpperCase() === categoryFilter;
  });

  const pinnedNotices = filteredNotices.filter((n) => Boolean(n.is_pinned));
  const regularNotices = filteredNotices.filter((n) => !n.is_pinned);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Company Notices &amp; Bulletins
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Workspace &amp; Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Internal engineering announcements, maintenance schedules, and operational notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/developer/notice-board"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal transition-colors inline-flex items-center gap-1.5"
          >
            <FiExternalLink />
            <span>Notice Board</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchNotices(true)}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
            title="Refresh Notices"
          >
            <FiRefreshCw />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreatePanel(!showCreatePanel)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <FiPlus />
              <span>{showCreatePanel ? 'Close Form' : 'Publish Notice'}</span>
            </button>
          )}
        </div>
      </div>

      {showCreatePanel && (
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Publish New Company Notice</h3>
              <p className="text-[11px] text-slate-500">Post an official memo or maintenance bulletin for the team</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notice Title *
              </label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Content &amp; Message *
              </label>
              <NoticeEditor
                value={createForm.content}
                onChange={(html) => setCreateForm({ ...createForm, content: html })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="GENERAL">General</option>
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="SECURITY">Security</option>
                  <option value="POLICY">Policy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pinNotice"
                checked={createForm.is_pinned}
                onChange={(e) => setCreateForm({ ...createForm, is_pinned: e.target.checked })}
                className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="pinNotice" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Pin this notice as an alert banner at the top of the board
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreatePanel(false)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNotice}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {savingNotice ? 'Posting...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Category:</span>
          {['ALL', 'ANNOUNCEMENT', 'MAINTENANCE', 'SECURITY', 'GENERAL'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat === 'ALL' ? 'All Bulletins' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {filteredNotices.length} notices
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <LoadingScreen fullScreen={false} size="sm" label="Loading notices..." />
        </div>
      ) : (
        <div className="space-y-4">
          {pinnedNotices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <FiBookmark className="text-sm" />
                <span>Pinned Announcements ({pinnedNotices.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pinnedNotices.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">{n.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(n)}
                            className="text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
                            title="Unpin notice"
                          >
                            <FiBookmark className="fill-current text-xs" />
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            title="Delete notice"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal prose prose-xs dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: n.content }}
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-900/60 text-[10px] text-slate-500 font-mono">
                      <span>{n.creator_name || 'Engineering Staff'}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {pinnedNotices.length > 0 && (
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Notices
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regularNotices.length === 0 && pinnedNotices.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                  No company notices found matching this category.
                </div>
              ) : (
                regularNotices.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getPriorityStyle(
                            n.priority
                          )}`}
                        >
                          {n.priority}
                        </span>
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">{n.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(n)}
                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            title="Pin notice to top"
                          >
                            <FiBookmark className="text-xs" />
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            title="Delete notice"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal prose prose-xs dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: n.content }}
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
                      <span>{n.creator_name || 'Staff'}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

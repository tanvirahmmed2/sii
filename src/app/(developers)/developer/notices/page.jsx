'use client';

import { useState, useEffect, useContext } from 'react';
import { Context } from 'src/component/helper/Context';

export default function DeveloperNoticesPage() {
  const { user } = useContext(Context);

  const [notices, setNotices] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create Notice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    category: 'GENERAL',
    is_pinned: false,
    target_role: 'ALL',
  });
  const [savingNotice, setSavingNotice] = useState(false);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/notices');
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices || []);
        setCanManage(Boolean(data.canManage));
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

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
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          content: '',
          priority: 'NORMAL',
          category: 'GENERAL',
          is_pinned: false,
          target_role: 'ALL',
        });
        fetchNotices();
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
        fetchNotices();
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
        fetchNotices();
      } else {
        alert(data.error || 'Failed to delete notice');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NORMAL':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'SECURITY':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MAINTENANCE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ANNOUNCEMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'POLICY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const pinnedNotices = notices.filter((n) => n.is_pinned);
  const regularNotices = notices.filter((n) => !n.is_pinned);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Company &amp; Team Notices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform bulletins, release announcements, infrastructure maintenance alerts, and policy updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotices}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Post Notice
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading notices bulletin...</div>
      ) : notices.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded space-y-2">
          <p className="text-xs text-slate-500 font-medium">No company notices have been published yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned Announcements */}
          {pinnedNotices.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                Pinned Announcements
              </div>
              <div className="grid grid-cols-1 gap-3">
                {pinnedNotices.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded bg-amber-50/40 border border-amber-200 space-y-2 relative"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border ${getCategoryStyle(n.category)}`}>
                          {n.category}
                        </span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${getPriorityStyle(n.priority)}`}>
                          {n.priority}
                        </span>
                        {n.target_role !== 'ALL' && (
                          <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            Target: {n.target_role}
                          </span>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePin(n)}
                            className="px-2 py-0.5 rounded border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-medium cursor-pointer"
                          >
                            Unpin
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="px-2 py-0.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 text-[10px] text-slate-500 font-mono">
                      <span>Posted by {n.creator_name || 'System Operator'}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Notices */}
          <div className="space-y-2">
            {pinnedNotices.length > 0 && (
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                All Announcements
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regularNotices.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded bg-white border border-slate-200 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border ${getCategoryStyle(n.category)}`}>
                          {n.category}
                        </span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${getPriorityStyle(n.priority)}`}>
                          {n.priority}
                        </span>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePin(n)}
                            className="px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                          >
                            Pin
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="px-2 py-0.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {n.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono mt-2">
                    <span>{n.creator_name || 'Staff'}</span>
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Post Notice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-lg w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Post Company Notice</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Scheduled Infrastructure Maintenance Window"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content / Message <span className="text-rose-600">*</span></label>
                <textarea
                  rows={4}
                  required
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  placeholder="Details, impact, steps required from the team..."
                  className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="GENERAL">General</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SECURITY">Security</option>
                    <option value="POLICY">Policy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
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
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="pinNotice" className="text-xs text-slate-700 cursor-pointer">
                  Pin this notice as an alert banner at the top
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotice}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {savingNotice ? 'Posting...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

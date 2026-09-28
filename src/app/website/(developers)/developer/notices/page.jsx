'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BiBell,
  BiPlus,
  BiPin,
  BiCheckShield,
  BiRefresh,
  BiTrash,
  BiTime,
  BiUser,
  BiCheck,
  BiCheckCircle,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

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
      const res = await fetch('/api/developer/notices');
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
      const res = await fetch('/api/developer/notices', {
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
      const res = await fetch(`/api/developer/notices/${notice.id}`, {
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
      const res = await fetch(`/api/developer/notices/${id}`, { method: 'DELETE' });
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
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'SECURITY':
        return 'bg-red-100 text-red-800';
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800';
      case 'ANNOUNCEMENT':
        return 'bg-purple-100 text-purple-800';
      case 'POLICY':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const pinnedNotices = notices.filter((n) => n.is_pinned);
  const regularNotices = notices.filter((n) => !n.is_pinned);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BiBell className="text-secondary" /> Company & Team Notices
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Platform bulletins, release announcements, infrastructure maintenance alerts, and policy updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotices}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh notices"
          >
            <BiRefresh className="text-lg" />
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold shadow-sm transition-all"
            >
              <BiPlus className="text-base" /> Post Notice
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">Loading notices bulletin...</div>
      ) : notices.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2 shadow-sm">
          <BiBell className="text-3xl text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">No company notices have been published yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Announcements */}
          {pinnedNotices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-widest">
                <BiPin className="text-base" /> Pinned Announcements
              </div>
              <div className="grid grid-cols-1 gap-4">
                {pinnedNotices.map((n) => (
                  <div
                    key={n.id}
                    className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200 shadow-sm space-y-3 relative group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${getCategoryStyle(n.category)}`}>
                          {n.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(n.priority)}`}>
                          {n.priority}
                        </span>
                        {n.target_role !== 'ALL' && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Target: {n.target_role}
                          </span>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTogglePin(n)}
                            className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-800 text-xs font-semibold"
                            title="Unpin"
                          >
                            <BiPin className="text-base" />
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600"
                            title="Delete Notice"
                          >
                            <BiTrash className="text-base" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-100 text-[11px] text-slate-400">
                      <span>Posted by {n.creator_name || 'System Operator'}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Notices */}
          <div className="space-y-3">
            {pinnedNotices.length > 0 && (
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pt-2">
                All Announcements
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regularNotices.map((n) => (
                <div
                  key={n.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${getCategoryStyle(n.category)}`}>
                          {n.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(n.priority)}`}>
                          {n.priority}
                        </span>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTogglePin(n)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                            title="Pin to top"
                          >
                            <BiPin className="text-base" />
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                            title="Delete Notice"
                          >
                            <BiTrash className="text-base" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {n.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400 mt-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Post Company Notice</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Scheduled Infrastructure Maintenance Window"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Content / Message</label>
                <textarea
                  rows={4}
                  required
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  placeholder="Details, impact, steps required from the team..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                  >
                    <option value="GENERAL">General</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SECURITY">Security</option>
                    <option value="POLICY">Policy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
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
                  className="w-4 h-4 rounded text-secondary"
                />
                <label htmlFor="pinNotice" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Pin this notice as an alert banner at the top
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotice}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
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

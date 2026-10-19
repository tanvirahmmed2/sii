'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-36 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Loading Editor...
    </div>
  ),
});

export default function ClubListPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Inline Edit State (NO popup)
  const [isEditing, setIsEditing] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editModeratorId, setEditModeratorId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Inline Delete State (NO popup)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const fetchClubs = async () => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/clubs?`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (selectedCategory !== 'all') url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setClubs(data.clubs || []);
        if (data.categories) setCategories(data.categories);
        if (data.teachers) setTeachers(data.teachers);
      } else {
        showToast(data.error || 'Failed to load clubs', true);
      }
    } catch (err) {
      console.error('Fetch clubs error:', err);
      showToast('Network error while loading club directory.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [domain, selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClubs();
  };

  const openInlineEdit = (club) => {
    setEditingClub(club);
    setEditName(club.name || '');
    setEditCategoryId(club.category_id ? String(club.category_id) : '');
    setEditCategoryName(club.category || '');
    setEditModeratorId(club.moderator_teacher_id ? String(club.moderator_teacher_id) : '');
    setEditDescription(club.description || '');
    setEditLogoUrl(club.logo_url || '');
    setEditIsActive(club.is_active);
    setIsEditing(true);
  };

  const closeInlineEdit = () => {
    setIsEditing(false);
    setEditingClub(null);
  };

  const handleUpdateClub = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Club name is required.', true);
      return;
    }

    setEditSubmitting(true);
    try {
      const selectedCat = categories.find((c) => String(c.id) === String(editCategoryId));
      const payload = {
        id: editingClub.id,
        name: editName.trim(),
        category_id: editCategoryId ? parseInt(editCategoryId, 10) : null,
        category: selectedCat ? selectedCat.name : editCategoryName.trim(),
        moderator_teacher_id: editModeratorId ? parseInt(editModeratorId, 10) : null,
        description: editDescription.trim(),
        logo_url: editLogoUrl.trim() || null,
        is_active: editIsActive,
      };

      const res = await fetch(`/api/${domain}/staff/panel/clubs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Club profile updated successfully.');
        closeInlineEdit();
        fetchClubs();
      } else {
        showToast(data.error || 'Update failed', true);
      }
    } catch (err) {
      console.error('Update error:', err);
      showToast('Network error while updating club.', true);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteClub = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Club deleted successfully.');
        setConfirmDeleteId(null);
        fetchClubs();
      } else {
        showToast(data.error || 'Failed to delete club', true);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error while deleting club.', true);
    } finally {
      setDeletingId(null);
    }
  };

  // KPIs
  const totalClubs = clubs.length;
  const activeClubs = clubs.filter((c) => c.is_active).length;
  const totalMembers = clubs.reduce((acc, c) => acc + (parseInt(c.member_count, 10) || 0), 0);
  const clubsWithChat = clubs.filter((c) => c.has_chat_box || c.chat_box_id).length;

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">OK</span>
        </div>
      )}
      {toastError && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Clubs</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalClubs}</span>
            <span className="text-[10px] font-medium text-slate-500">Registered</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Clubs</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{activeClubs}</span>
            <span className="text-[10px] font-medium text-emerald-600">Operational</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Members</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalMembers}</span>
            <span className="text-[10px] font-medium text-blue-600">Active Students</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Chat Rooms</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-primary font-mono">{clubsWithChat}</span>
            <span className="text-[10px] font-medium text-primary">Chat Channels</span>
          </div>
        </div>
      </div>

      {/* Inline Edit Club Panel (NO popup) */}
      {isEditing && editingClub && (
        <div className="bg-white dark:bg-slate-900 border border-primary/30 rounded p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Edit Club: {editingClub.name}
            </h3>
            <button
              onClick={closeInlineEdit}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleUpdateClub} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Club Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Moderator
                </label>
                <select
                  value={editModeratorId}
                  onChange={(e) => setEditModeratorId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={editLogoUrl}
                onChange={(e) => setEditLogoUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Mission & Description
                </label>
                <span className="text-[10px] text-slate-400">Tiptap Rich Editor</span>
              </div>
              <TiptapEditor
                value={editDescription}
                onChange={(val) => setEditDescription(val)}
                placeholder="Outline the club's mission, regular activities, membership criteria, goals, and focus areas..."
                minHeight="160px"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editIsActive" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Club is Active &amp; Operational
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeInlineEdit}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Interactive Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search club name, description, moderator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <Link
              href={`/${domain}/staff-panel/club-create`}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white cursor-pointer transition whitespace-nowrap"
            >
              + Create Club
            </Link>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Club Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Assigned Moderator</th>
                <th className="px-3 py-2 text-center">Members</th>
                <th className="px-3 py-2 text-center">Chat Box</th>
                <th className="px-3 py-2 text-center">Notices / News</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-slate-400">
                    Loading clubs directory...
                  </td>
                </tr>
              ) : clubs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-slate-400">
                    No clubs found matching your criteria. Click &quot;+ Create Club&quot; to establish a new club.
                  </td>
                </tr>
              ) : (
                clubs.map((club) => (
                  <tr key={club.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {club.logo_url ? (
                          <img
                            src={club.logo_url}
                            alt={club.name}
                            className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-[10px] text-slate-600 dark:text-slate-300 shrink-0">
                            {club.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white leading-tight">{club.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: #{club.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        {club.category_name || club.category || 'General'}
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      {club.moderator_teacher_name ? (
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{club.moderator_teacher_name}</p>
                          <p className="text-[10px] text-slate-400">{club.moderator_teacher_email || 'Faculty'}</p>
                        </div>
                      ) : (
                        <Link
                          href={`/${domain}/staff-panel/club-moderator?club_id=${club.id}`}
                          className="text-[10px] text-primary hover:underline font-medium"
                        >
                          + Assign Moderator
                        </Link>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center">
                      <Link
                        href={`/${domain}/staff-panel/club-members?club_id=${club.id}`}
                        className="font-mono font-medium text-slate-900 dark:text-slate-200 hover:text-primary transition"
                        title="View members"
                      >
                        {club.member_count || 0}
                      </Link>
                      <p className="text-[9px] text-slate-400">
                        {club.chat_member_count || 0} in chat
                      </p>
                    </td>

                    <td className="px-3 py-2 text-center">
                      {club.has_chat_box || club.chat_box_id ? (
                        <Link
                          href={`/${domain}/staff-panel/club-moderator?club_id=${club.id}`}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                        >
                          Chat Enabled
                        </Link>
                      ) : (
                        <Link
                          href={`/${domain}/staff-panel/club-moderator?club_id=${club.id}`}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-800"
                        >
                          + Enable Chat
                        </Link>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{club.notices_count || 0}</span> / <span>{club.news_count || 0}</span>
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          club.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {club.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {confirmDeleteId === club.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-1 rounded">
                          <span className="text-[10px] text-rose-700 dark:text-rose-300">Delete?</span>
                          <button
                            onClick={() => handleDeleteClub(club.id)}
                            disabled={deletingId === club.id}
                            className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 border border-slate-300 text-slate-600 text-[10px] rounded cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <Link
                            href={`/${domain}/staff-panel/club-moderator?club_id=${club.id}`}
                            className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-block"
                          >
                            Moderator
                          </Link>
                          <button
                            onClick={() => openInlineEdit(club)}
                            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center"
                            title="Edit Club"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(club.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center"
                            title="Delete Club"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </>
                      )}
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

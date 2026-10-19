'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-36 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Loading Editor...
    </div>
  ),
});

export default function ClubCreatePage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [moderatorTeacherId, setModeratorTeacherId] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [createChatBox, setCreateChatBox] = useState(true);

  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    async function loadMeta() {
      try {
        const [catsRes, teachRes] = await Promise.all([
          fetch(`/api/${domain}/staff/panel/clubs/category`),
          fetch(`/api/${domain}/staff/panel/clubs/moderator`),
        ]);
        const catsData = await catsRes.json();
        const teachData = await teachRes.json();

        if (catsData.success) {
          setCategories(catsData.categories || []);
          if (catsData.categories?.length > 0) {
            setCategoryId(String(catsData.categories[0].id));
          }
        }
        if (teachData.success) {
          setTeachers(teachData.teachers || []);
        }
      } catch (err) {
        console.error('Failed to load initial metadata:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadMeta();
  }, [domain]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Club name is required.', true);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('is_active', isActive);
      formData.append('create_chat_box', createChatBox);

      if (categoryId) {
        formData.append('category_id', categoryId);
        const selectedCat = categories.find((c) => String(c.id) === String(categoryId));
        if (selectedCat) formData.append('category', selectedCat.name);
      } else if (customCategory.trim()) {
        formData.append('category', customCategory.trim());
      }

      if (moderatorTeacherId) {
        formData.append('moderator_teacher_id', moderatorTeacherId);
      }

      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (logoFile) {
        formData.append('logoFile', logoFile);
      } else if (logoUrl.trim()) {
        formData.append('logo_url', logoUrl.trim());
      }

      const res = await fetch(`/api/${domain}/staff/panel/clubs`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast('Club created successfully! Redirecting to Club Directory...');
        setTimeout(() => {
          router.push(`/${domain}/staff-panel/club-list`);
        }, 1200);
      } else {
        showToast(data.error || 'Failed to create club', true);
      }
    } catch (err) {
      console.error('Club creation error:', err);
      showToast('Network error while creating club.', true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">SUCCESS</span>
        </div>
      )}
      {toastError && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>
      )}

      {/* Header with Navigation Link */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Register New Club</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure club identity, assign a faculty moderator, and establish communication channels.
          </p>
        </div>
        <Link
          href={`/${domain}/staff-panel/club-list`}
          className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          Back to Club List
        </Link>
      </div>

      {/* Main Full-Width Form Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 sm:p-5 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Club Name */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Club Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Science & Innovation Society, Debating Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="other">Other / Custom</option>
                </select>
                <Link
                  href={`/${domain}/staff-panel/club-category`}
                  className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  title="Manage Categories"
                >
                  + Add Category
                </Link>
              </div>

              {categoryId === 'other' && (
                <input
                  type="text"
                  placeholder="Enter custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              )}
            </div>

            {/* Moderator Teacher Assignment */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assigned Moderator (Faculty)
              </label>
              <select
                value={moderatorTeacherId}
                onChange={(e) => setModeratorTeacherId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">No Moderator Assigned (Assign later)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.designation ? `(${t.designation})` : ''} - {t.email}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Assigned teachers can manage the club, oversee members, and moderate live chats.
              </p>
            </div>

            {/* Logo Upload / URL */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Club Logo / Emblem
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                  />
                )}
              </div>
              <input
                type="url"
                placeholder="Or paste external image URL (https://...)"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Mission & Description
              </label>
              <span className="text-[10px] text-slate-400">Tiptap Rich Editor</span>
            </div>
            <TiptapEditor
              value={description}
              onChange={(val) => setDescription(val)}
              placeholder="Outline the club's mission, regular activities, membership criteria, goals, and focus areas..."
              minHeight="180px"
            />
          </div>

          {/* Chat Box & Status Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-2.5 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <input
                type="checkbox"
                id="createChatBox"
                checked={createChatBox}
                onChange={(e) => setCreateChatBox(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <label htmlFor="createChatBox" className="text-xs font-medium text-slate-900 dark:text-white cursor-pointer">
                  Initialize Official Club Chat Box
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically set up a live communication room accessible to the moderator and authorized members.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <label htmlFor="isActive" className="text-xs font-medium text-slate-900 dark:text-white cursor-pointer">
                  Club Active Status
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Active clubs are publicly discoverable on the portal and accept student membership enrollments.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href={`/${domain}/staff-panel/club-list`}
              className="px-3.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Registering Club...' : 'Save & Publish Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

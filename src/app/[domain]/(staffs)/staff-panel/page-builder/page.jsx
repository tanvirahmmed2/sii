'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiLayout, FiLayers, FiSliders, FiImage, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiExternalLink, FiCheck } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function PageBuilderStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pages'); // pages | theme | blocks | media
  const [data, setData] = useState({ pages: [], theme: null, global_blocks: [], menus: [], media_files: [] });

  // Page Modal state
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageMetaTitle, setPageMetaTitle] = useState('');
  const [pageMetaDesc, setPageMetaDesc] = useState('');
  const [pagePublished, setPagePublished] = useState(false);
  const [pageHomepage, setPageHomepage] = useState(false);
  const [submittingPage, setSubmittingPage] = useState(false);

  // Theme state
  const [themeColors, setThemeColors] = useState({ primary: '#2563eb', secondary: '#475569', accent: '#f59e0b' });
  const [savingTheme, setSavingTheme] = useState(false);

  // Block modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockType, setBlockType] = useState('announcement_bar');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/page-builder'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (res.data.theme?.colors) {
          setThemeColors(res.data.theme.colors);
        }
        if (showToast) toast.success('CMS & Page Builder data refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load page builder records');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to CMS service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreatePage = () => {
    setEditingPage(null);
    setPageTitle('');
    setPageSlug('');
    setPageMetaTitle('');
    setPageMetaDesc('');
    setPagePublished(true);
    setPageHomepage(false);
    setIsPageModalOpen(true);
  };

  const openEditPage = (p) => {
    setEditingPage(p);
    setPageTitle(p.title);
    setPageSlug(p.slug);
    setPageMetaTitle(p.meta_title || '');
    setPageMetaDesc(p.meta_description || '');
    setPagePublished(p.is_published);
    setPageHomepage(p.is_homepage);
    setIsPageModalOpen(true);
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    if (!pageTitle.trim()) return;
    setSubmittingPage(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'save_page',
        id: editingPage?.id,
        title: pageTitle.trim(),
        slug: pageSlug.trim(),
        meta_title: pageMetaTitle.trim(),
        meta_description: pageMetaDesc.trim(),
        is_published: pagePublished,
        is_homepage: pageHomepage,
        content: editingPage?.content || [
          { type: 'hero', heading: pageTitle, subheading: 'Welcome to our institution' },
        ],
      });
      if (res.data?.success) {
        toast.success(editingPage ? 'Page updated successfully' : 'Page created');
        setIsPageModalOpen(false);
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to save page');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving page');
    } finally {
      setSubmittingPage(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!confirm('Are you sure you want to permanently delete this page?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?page_id=${pageId}`);
      if (res.data?.success) {
        toast.success('Page deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete page');
    }
  };

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'update_theme',
        colors: themeColors,
      });
      if (res.data?.success) {
        toast.success('Theme visual styles updated');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update theme');
    } finally {
      setSavingTheme(false);
    }
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!blockName.trim()) return;
    setSubmittingBlock(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'save_block',
        name: blockName.trim(),
        block_type: blockType,
        content: { text: `Announcement: Welcome to our campus!`, link: '#' },
        is_active: true,
      });
      if (res.data?.success) {
        toast.success('Global block created');
        setIsBlockModalOpen(false);
        setBlockName('');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to create block');
    } finally {
      setSubmittingBlock(false);
    }
  };

  if (loading) {
    return <Loader message="Loading Drag & Drop Page Builder & CMS..." />;
  }

  const { pages, theme, global_blocks, media_files } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiLayout className="text-primary" /> Drag & Drop Page Builder & CMS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build custom landing pages with JSONB component trees, theme customization, global blocks & media assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={openCreatePage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> New Page
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'pages'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiLayout /> Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'theme'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiSliders /> Theme Customizer
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'blocks'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiLayers /> Global Blocks ({global_blocks.length})
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'media'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiImage /> Media Assets ({media_files.length})
        </button>
      </div>

      {/* Tab 1: Pages List */}
      {activeTab === 'pages' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Page Title</th>
                  <th className="px-6 py-3">Slug / URL</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Last Updated</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No custom pages created yet. Click &quot;New Page&quot; to build an institutional landing page.
                    </td>
                  </tr>
                ) : (
                  pages.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {p.title}
                        {p.is_homepage && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded">
                            Home
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        /{p.slug}
                      </td>
                      <td className="px-6 py-4">
                        {p.is_published ? (
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs capitalize">{p.template || 'Standard'}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(p.updated_at || p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEditPage(p)}
                          className="text-primary hover:text-primary-dark p-1 rounded"
                          title="Edit Page"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDeletePage(p.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                          title="Delete Page"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Theme Customizer */}
      {activeTab === 'theme' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Brand Colors & Typography</h2>
            <p className="text-xs text-slate-500 mt-1">Configure your institution&apos;s primary palette applied to public website pages.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColors.primary || '#2563eb'}
                  onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })}
                  className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColors.primary || '#2563eb'}
                  onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 font-mono w-32"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColors.secondary || '#475569'}
                  onChange={(e) => setThemeColors({ ...themeColors, secondary: e.target.value })}
                  className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColors.secondary || '#475569'}
                  onChange={(e) => setThemeColors({ ...themeColors, secondary: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 font-mono w-32"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Accent Highlight Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColors.accent || '#f59e0b'}
                  onChange={(e) => setThemeColors({ ...themeColors, accent: e.target.value })}
                  className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColors.accent || '#f59e0b'}
                  onChange={(e) => setThemeColors({ ...themeColors, accent: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 font-mono w-32"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveTheme}
                disabled={savingTheme}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
              >
                {savingTheme ? 'Saving Theme...' : 'Save Theme Visuals'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Global Blocks */}
      {activeTab === 'blocks' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reusable Global Blocks</h2>
              <p className="text-xs text-slate-500 mt-1">Headers, footers, announcement ribbons, and notice banners across pages.</p>
            </div>
            <button
              onClick={() => setIsBlockModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
            >
              <FiPlus /> Add Global Block
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {global_blocks.length === 0 ? (
              <div className="col-span-full py-6 text-center text-slate-400 text-sm">
                No reusable global blocks defined yet.
              </div>
            ) : (
              global_blocks.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{b.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {b.block_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Status: {b.is_active ? 'Active' : 'Disabled'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Media Assets */}
      {activeTab === 'media' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Media Library Assets</h2>
            <span className="text-xs text-slate-500">Assets uploaded for pages and banners</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {media_files.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No media assets uploaded yet.
              </div>
            ) : (
              media_files.map((m) => (
                <div key={m.id} className="group relative rounded-lg border border-slate-200 overflow-hidden">
                  <div className="aspect-square bg-slate-100 flex items-center justify-center">
                    <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 text-[11px] truncate text-slate-700">{m.file_name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Page Edit/Create Modal */}
      {isPageModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {editingPage ? 'Edit Page Settings' : 'Create New Landing Page'}
            </h3>
            <form onSubmit={handleSavePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Page Title</label>
                <input
                  type="text"
                  placeholder="e.g. Science Fair 2026"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. science-fair-2026"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Meta SEO Title</label>
                <input
                  type="text"
                  placeholder="Meta title for Google search"
                  value={pageMetaTitle}
                  onChange={(e) => setPageMetaTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Meta Description</label>
                <textarea
                  placeholder="SEO description snippet..."
                  value={pageMetaDesc}
                  onChange={(e) => setPageMetaDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagePublished}
                    onChange={(e) => setPagePublished(e.target.checked)}
                    className="rounded text-primary"
                  />
                  Publish Page Immediately
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageHomepage}
                    onChange={(e) => setPageHomepage(e.target.checked)}
                    className="rounded text-primary"
                  />
                  Set as Homepage
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPageModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPage}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {submittingPage ? 'Saving...' : 'Save Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Block Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Create Global Block</h3>
            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Block Name</label>
                <input
                  type="text"
                  placeholder="e.g. Admission 2026 Top Alert Ribbon"
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Block Type</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="announcement_bar">Announcement Bar</option>
                  <option value="header">Custom Header</option>
                  <option value="footer">Custom Footer</option>
                  <option value="cta">Call to Action Widget</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlock}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingBlock ? 'Saving...' : 'Create Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


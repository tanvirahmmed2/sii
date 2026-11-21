'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
const TiptapEditor = dynamic(() => import('src/component/website/ui/TiptapEditor'), {
    ssr: false,
    loading: () => (<div className="w-full h-44 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Loading Editor...
    </div>),
});
export default function ClubNewsPage() {
    const params: any = useParams();
    const domain = params?.domain || '';
    const [news, setNews] = useState<any>([]);
    const [clubs, setClubs] = useState<any>([]);
    const [loading, setLoading] = useState<any>(true);
    const [searchTerm, setSearchTerm] = useState<any>('');
    const [selectedClub, setSelectedClub] = useState<any>('all');
    const [selectedStatus, setSelectedStatus] = useState<any>('all');
    const [isFormOpen, setIsFormOpen] = useState<any>(false);
    const [editingNews, setEditingNews] = useState<any>(null);
    const [formClubId, setFormClubId] = useState<any>('');
    const [formTitle, setFormTitle] = useState<any>('');
    const [formSummary, setFormSummary] = useState<any>('');
    const [formContent, setFormContent] = useState<any>('');
    const [formImageUrl, setFormImageUrl] = useState<any>('');
    const [formImageFile, setFormImageFile] = useState<any>(null);
    const [formImagePreview, setFormImagePreview] = useState<any>(null);
    const [formPublishedDate, setFormPublishedDate] = useState<any>('');
    const [formIsPublished, setFormIsPublished] = useState<any>(true);
    const [submitting, setSubmitting] = useState<any>(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<any>(null);
    const [toastMessage, setToastMessage] = useState<any>(null);
    const [toastError, setToastError] = useState<any>(null);
    const showToast = (msg: any, isError: any = false) => {
        if (isError) {
            setToastError(msg);
            setTimeout(() => setToastError(null), 4000);
        }
        else {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
        }
    };
    const fetchNews = async () => {
        setLoading(true);
        try {
            let url = `/api/${domain}/staff/panel/clubs/news?`;
            if (selectedClub !== 'all')
                url += `club_id=${selectedClub}&`;
            if (selectedStatus !== 'all')
                url += `status=${selectedStatus}&`;
            if (searchTerm.trim())
                url += `search=${encodeURIComponent(searchTerm.trim())}&`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setNews(data.news || []);
                if (data.clubs)
                    setClubs(data.clubs);
            }
            else {
                showToast(data.error || 'Failed to load news', true);
            }
        }
        catch (err: any) {
            console.error('Fetch news error:', err);
            showToast('Network error while loading club news.', true);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchNews();
    }, [domain, selectedClub, selectedStatus]);
    const handleSearchSubmit = (e: any) => {
        e.preventDefault();
        fetchNews();
    };
    const handleImageFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const openCreateForm = () => {
        setEditingNews(null);
        setFormClubId(selectedClub !== 'all' ? selectedClub : clubs[0]?.id ? String(clubs[0].id) : '');
        setFormTitle('');
        setFormSummary('');
        setFormContent('');
        setFormImageUrl('');
        setFormImageFile(null);
        setFormImagePreview(null);
        setFormPublishedDate(new Date().toISOString().split('T')[0]);
        setFormIsPublished(true);
        setIsFormOpen(true);
    };
    const openEditForm = (article: any) => {
        setEditingNews(article);
        setFormClubId(String(article.club_id));
        setFormTitle(article.title || '');
        setFormSummary(article.summary || '');
        setFormContent(article.content || '');
        setFormImageUrl(article.image_url || '');
        setFormImageFile(null);
        setFormImagePreview(article.image_url || null);
        setFormPublishedDate(article.published_date ? article.published_date.split('T')[0] : '');
        setFormIsPublished(Boolean(article.is_published));
        setIsFormOpen(true);
    };
    const closeForm = () => {
        setIsFormOpen(false);
        setEditingNews(null);
        setFormTitle('');
        setFormSummary('');
        setFormContent('');
        setFormImageUrl('');
        setFormImageFile(null);
        setFormImagePreview(null);
    };
    const handleSaveNews = async (e: any) => {
        e.preventDefault();
        if (!formClubId || !formTitle.trim()) {
            showToast('Please select a club and enter news title.', true);
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('club_id', formClubId as any);
            formData.append('title', formTitle.trim() as any);
            formData.append('summary', formSummary.trim() as any);
            formData.append('content', formContent.trim() as any);
            formData.append('published_date', formPublishedDate || new Date().toISOString().split('T')[0] as any);
            formData.append('is_published', formIsPublished as any);
            if (formImageFile) {
                formData.append('imageFile', formImageFile as any);
            }
            else if (formImageUrl.trim()) {
                formData.append('image_url', formImageUrl.trim() as any);
            }
            if (editingNews) {
                formData.append('id', editingNews.id as any);
            }
            const method = editingNews ? 'PUT' : 'POST';
            const res = await fetch(`/api/${domain}/staff/panel/clubs/news`, {
                method,
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                showToast(editingNews ? 'Article updated successfully.' : 'Article published successfully.');
                closeForm();
                fetchNews();
            }
            else {
                showToast(data.error || 'Operation failed', true);
            }
        }
        catch (err: any) {
            console.error('Save news error:', err);
            showToast('Network error while saving news.', true);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDeleteNews = async (id: any) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/${domain}/staff/panel/clubs/news?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                showToast('Article deleted successfully.');
                setConfirmDeleteId(null);
                fetchNews();
            }
            else {
                showToast(data.error || 'Failed to delete news', true);
            }
        }
        catch (err: any) {
            console.error('Delete error:', err);
            showToast('Network error while deleting news.', true);
        }
        finally {
            setDeletingId(null);
        }
    };
    const totalNews = news.length;
    const publishedCount = news.filter((n: any) => n.is_published).length;
    const distinctClubs = new Set(news.map((n: any) => n.club_id)).size;
    return (<div className="w-full space-y-4">
      {toastMessage && (<div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">OK</span>
        </div>)}
      {toastError && (<div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>)}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Articles</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalNews}</span>
            <span className="text-[10px] font-medium text-slate-500">Dispatches</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Published</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{publishedCount}</span>
            <span className="text-[10px] font-medium text-emerald-600">Live Online</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Covered Clubs</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{distinctClubs}</span>
            <span className="text-[10px] font-medium text-blue-600">Active Societies</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">System Cycle</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">2026-T1</span>
            <span className="text-[10px] font-medium text-slate-500">Current Session</span>
          </div>
        </div>
      </div>

      {isFormOpen && (<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingNews ? 'Edit News Article' : 'Publish Club News'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {editingNews
                ? 'Update article details, cover imagery, or publication visibility.'
                : 'Post a new article, report, or achievement notice for public display.'}
              </p>
            </div>
            <button type="button" onClick={closeForm} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveNews} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Club *
                </label>
                <select required value={formClubId} onChange={(e: any) => setFormClubId(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer">
                  <option value="">Select Club...</option>
                  {clubs.map((c: any) => (<option key={c.id} value={c.id}>
                      {c.name} ({c.category || 'General'})
                    </option>))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Publish Date
                </label>
                <input type="date" value={formPublishedDate} onChange={(e: any) => setFormPublishedDate(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"/>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Article Title *
              </label>
              <input type="text" required value={formTitle} onChange={(e: any) => setFormTitle(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"/>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Featured Cover Image
              </label>
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>
                {formImagePreview && (<img src={formImagePreview} alt="Preview" className="w-10 h-8 rounded object-cover border border-slate-200 shrink-0"/>)}
              </div>
              <input type="url" value={formImageUrl} onChange={(e: any) => setFormImageUrl(e.target.value)} className="w-full mt-2 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"/>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Summary / Excerpt
              </label>
              <textarea rows={2} value={formSummary} onChange={(e: any) => setFormSummary(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"/>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Full Article Content
                </label>
                <span className="text-[10px] text-slate-400">Tiptap Rich Editor</span>
              </div>
              <TiptapEditor value={formContent} onChange={(val: any) => setFormContent(val)} minHeight="220px"/>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="newsIsPublished" checked={formIsPublished} onChange={(e: any) => setFormIsPublished(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"/>
              <label htmlFor="newsIsPublished" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Publish Article to Campus Public Feed
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={closeForm} className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50">
                {submitting ? 'Saving...' : editingNews ? 'Update Article' : 'Publish Article'}
              </button>
            </div>
          </form>
        </div>)}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <input type="text" value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"/>
            <button type="submit" className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={selectedClub} onChange={(e: any) => setSelectedClub(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer">
              <option value="all">All Clubs</option>
              {clubs.map((c: any) => (<option key={c.id} value={c.id}>
                  {c.name}
                </option>))}
            </select>

            <select value={selectedStatus} onChange={(e: any) => setSelectedStatus(e.target.value)} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer">
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            <button onClick={isFormOpen ? closeForm : openCreateForm} className="px-3 py-1.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white cursor-pointer transition whitespace-nowrap">
              {isFormOpen ? 'Hide Editor' : '+ Publish News'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Article</th>
                <th className="px-3 py-2">Club Name</th>
                <th className="px-3 py-2">Excerpt / Summary</th>
                <th className="px-3 py-2">Publish Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (<tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    Loading club news articles...
                  </td>
                </tr>) : news.length === 0 ? (<tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    No news articles published yet. Click &quot;+ Publish News&quot; to post a new activity dispatch.
                  </td>
                </tr>) : (news.map((item: any) => (<tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        {item.image_url ? (<img src={item.image_url} alt={item.title} className="w-10 h-8 rounded object-cover border border-slate-200 shrink-0"/>) : (<div className="w-10 h-8 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-[10px] text-slate-500 shrink-0">
                            News
                          </div>)}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white leading-tight">{item.title}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.club_name}</span>
                      <p className="text-[10px] text-slate-400">{item.club_category}</p>
                    </td>

                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {item.summary || '—'}
                    </td>

                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                      {item.published_date ? new Date(item.published_date).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${item.is_published
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'}`}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {confirmDeleteId === item.id ? (<div className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-600 font-semibold">Delete?</span>
                          <button onClick={() => handleDeleteNews(item.id)} disabled={deletingId === item.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition disabled:opacity-50">
                            {deletingId === item.id ? '...' : 'Yes'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                            No
                          </button>
                        </div>) : (<>
                          <button onClick={() => openEditForm(item)} className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center" title="Edit Article">
                            <FiEdit2 className="text-xs"/>
                          </button>
                          <button onClick={() => setConfirmDeleteId(item.id)} className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center" title="Delete Article">
                            <FiTrash2 className="text-xs"/>
                          </button>
                        </>)}
                    </td>
                  </tr>)))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}

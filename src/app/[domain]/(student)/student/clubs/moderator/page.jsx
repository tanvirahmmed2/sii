'use client';

import React, { useState, useEffect } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { toast } from 'react-hot-toast';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentClubModeratorPage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [isClubModerator, setIsClubModerator] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');

  // Manage News states
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [savingNews, setSavingNews] = useState(false);

  const fetchStudentClubs = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('student/clubs/moderator'));
      if (res.ok) {
        const responseData = await res.json();
        const payload = responseData.payload || responseData.paylod || responseData;
        if (payload.isClubModerator && payload.clubs?.length > 0) {
          setIsClubModerator(true);
          setClubs(payload.clubs);
          const firstClub = payload.clubs[0];
          setSelectedClubId(String(firstClub.id));
        } else {
          setIsClubModerator(false);
          setClubs([]);
        }
      }
    } catch {
      toast.error('Failed to load club moderator details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentClubs();
  }, [getApiEndpoint]);

  const currentClub = clubs.find(c => String(c.id) === String(selectedClubId));

  useEffect(() => {
    if (currentClub) {
      setEditingNewsId(null);
      setNewsTitle('');
      setNewsContent('');
      setNewsImage('');
    }
  }, [selectedClubId, currentClub]);

  // Image handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image size must be less than 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewsImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save News (Moderator)
  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) {
      toast.error('Title and content are required.');
      return;
    }

    setSavingNews(true);
    try {
      const res = await fetch(getApiEndpoint('student/clubs/moderator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manage_news',
          club_id: selectedClubId,
          news_id: editingNewsId,
          title: newsTitle,
          content: newsContent,
          image: newsImage
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Club news saved!');
        setEditingNewsId(null);
        setNewsTitle('');
        setNewsContent('');
        setNewsImage('');
        fetchStudentClubs();
      } else {
        toast.error(data.error || 'Failed to save news');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save news');
    } finally {
      setSavingNews(false);
    }
  };

  // Delete News
  const handleDeleteNews = async (newsId) => {
    if (!confirm('Delete this news post?')) return;
    try {
      const res = await fetch(getApiEndpoint('student/clubs/moderator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_news',
          club_id: selectedClubId,
          news_id: newsId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'News deleted');
        fetchStudentClubs();
      } else {
        toast.error(data.error || 'Failed to delete news');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete news');
    }
  };

  const handleEditNewsClick = (item) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsContent(item.content);
    setNewsImage(item.image_url || '');
  };

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  if (!isClubModerator || clubs.length === 0) {
    return (
      <div className="w-full space-y-4">
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Not Assigned as Moderator
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
            You are not currently designated as an active club executive or moderator for this institution.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="w-full pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              Moderator Desk
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {currentClub?.moderator_designation || 'Club Executive'}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            {currentClub?.name} — Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Publish official announcements, manage society news, and update club activities.
          </p>
        </div>

        {clubs.length > 1 && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-primary cursor-pointer"
          >
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* News Article Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              {editingNewsId ? 'Edit Announcement' : 'Publish Announcement'}
            </h2>
            {editingNewsId && (
              <button
                type="button"
                onClick={() => {
                  setEditingNewsId(null);
                  setNewsTitle('');
                  setNewsContent('');
                  setNewsImage('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSaveNews} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Article Title *</label>
              <input
                type="text"
                required
                placeholder="Announcement Headline..."
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Article Content *</label>
              <textarea
                rows={5}
                required
                placeholder="Type announcements, event details, or notices here..."
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-primary resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Feature Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={savingNews}
              className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {savingNews ? 'Saving...' : editingNewsId ? 'Update Article' : 'Publish Article'}
            </button>
          </form>
        </div>

        {/* News List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Published News &amp; Notices
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Total: {currentClub?.news?.length || 0}
            </span>
          </div>

          <div className="space-y-2.5">
            {currentClub?.news?.map(item => (
              <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditNewsClick(item)}
                      className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      title="Edit Post"
                    >
                      <FiEdit2 className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNews(item.id)}
                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Delete Post"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                {item.created_at && (
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    Published: {new Date(item.created_at).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            ))}

            {(!currentClub?.news || currentClub.news.length === 0) && (
              <p className="text-center text-xs text-slate-400 py-8">
                No club announcements published yet. Use the form to post an update.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentClubModeratorPage;

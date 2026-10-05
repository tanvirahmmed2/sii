'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiFileText, FiTrash2, FiEdit2, FiAlertCircle, FiPlus } from 'react-icons/fi';


const TeacherClubNewsPage = () => {
  const [loading, setLoading] = useState(true);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');

  // News states
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [savingNews, setSavingNews] = useState(false);

  useEffect(() => {
    fetchTeacherClubs();
  }, []);

  const fetchTeacherClubs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/teacher/clubs');
      const payload = response.data?.paylod || {};
      if (payload.isClubAdmin && payload.clubs?.length > 0) {
        setIsClubAdmin(true);
        setClubs(payload.clubs);
        const firstClub = payload.clubs[0];
        setSelectedClubId(String(firstClub.id));
      } else {
        setIsClubAdmin(false);
        setClubs([]);
      }
    } catch (error) {
      toast.error('Failed to load news details.');
    } finally {
      setLoading(false);
    }
  };

  const currentClub = clubs.find(c => String(c.id) === String(selectedClubId));

  useEffect(() => {
    if (currentClub) {
      setEditingNewsId(null);
      setNewsTitle('');
      setNewsContent('');
      setNewsImage('');
    }
  }, [selectedClubId]);

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

  // Manage News
  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) {
      toast.error('Title and content are required.');
      return;
    }

    setSavingNews(true);
    try {
      const res = await axios.post('/api/teacher/clubs', {
        action: 'manage_news',
        club_id: selectedClubId,
        news_id: editingNewsId,
        title: newsTitle,
        content: newsContent,
        image: newsImage
      });
      toast.success(res.data.message || 'Club news saved!');
      setEditingNewsId(null);
      setNewsTitle('');
      setNewsContent('');
      setNewsImage('');
      fetchTeacherClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save news');
    } finally {
      setSavingNews(false);
    }
  };

  // Delete News
  const handleDeleteNews = async (newsId) => {
    if (!confirm('Delete this news article?')) return;
    try {
      const res = await axios.post('/api/teacher/clubs', {
        action: 'delete_news',
        club_id: selectedClubId,
        news_id: newsId
      });
      toast.success(res.data.message || 'News deleted');
      fetchTeacherClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete news');
    }
  };

  const handleEditNewsClick = (item) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsContent(item.content);
    setNewsImage(item.image_url || '');
  };

  if (loading) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading News Manager...</span>
      </div>
    );
  }

  if (!isClubAdmin || clubs.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
        <FiAlertCircle className="text-2xl text-slate-400 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800">Not Assigned to Any Club</h2>
        <p className="text-xs text-slate-500">You are not currently assigned as a Club Admin.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{currentClub?.name || 'Club Admin'}</h1>
          <p className="text-xs text-slate-500">
            Role: <span className="font-semibold text-slate-700">{currentClub?.admin_designation || 'Club Admin'}</span>
          </p>
        </div>

        {clubs.length > 1 && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer"
          >
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Publish/Edit News Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FiFileText className="text-primary" /> {editingNewsId ? 'Edit News Post' : 'Publish New Article'}
            </h2>
            {editingNewsId && (
              <button
                onClick={() => {
                  setEditingNewsId(null);
                  setNewsTitle('');
                  setNewsContent('');
                  setNewsImage('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSaveNews} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">News Title *</label>
              <input
                type="text"
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Content Body *</label>
              <textarea
                rows={6}
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-none focus:bg-white leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cover Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100 file:font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={savingNews}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors mt-2"
            >
              {savingNews ? 'Publishing...' : editingNewsId ? 'Update Article' : 'Publish Article'}
            </button>
          </form>
        </div>

        {/* News Posts List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FiFileText /> Published Club News &amp; Activity Posts
            </h2>
            <p className="text-xs text-slate-500">{currentClub?.news?.length || 0} Total Published Articles</p>
          </div>

          <div className="space-y-3">
            {currentClub?.news?.map(item => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditNewsClick(item)} className="p-1 text-slate-500 hover:text-slate-800" title="Edit">
                      <FiEdit2 />
                    </button>
                    <button onClick={() => handleDeleteNews(item.id)} className="p-1 text-slate-500 hover:text-red-600" title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded-lg border border-slate-200" />
                )}
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>
            ))}

            {(!currentClub?.news || currentClub.news.length === 0) && (
              <p className="text-center text-xs text-slate-400 py-10">No club news posts published yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherClubNewsPage;

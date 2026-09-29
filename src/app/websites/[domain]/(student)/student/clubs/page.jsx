'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiUsers, FiFileText, FiTrash2, FiEdit2,
  FiAlertCircle, FiInfo, FiCalendar, FiShield
} from 'react-icons/fi';

const StudentClubsDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [isClubMember, setIsClubMember] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');

  // News management states for moderators
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [savingNews, setSavingNews] = useState(false);

  useEffect(() => {
    fetchStudentClubs();
  }, []);

  const fetchStudentClubs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/student/clubs');
      const payload = response.data?.paylod || {};
      if (payload.isClubMember && payload.clubs?.length > 0) {
        setIsClubMember(true);
        setClubs(payload.clubs);
        const firstClub = payload.clubs[0];
        setSelectedClubId(String(firstClub.id));
      } else {
        setIsClubMember(false);
        setClubs([]);
      }
    } catch (error) {
      toast.error('Failed to load club details.');
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

  // Save News (Moderators only)
  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) {
      toast.error('Title and content are required.');
      return;
    }

    setSavingNews(true);
    try {
      const res = await axios.post('/api/student/clubs', {
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
      fetchStudentClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save news');
    } finally {
      setSavingNews(false);
    }
  };

  // Delete News
  const handleDeleteNews = async (newsId) => {
    if (!confirm('Delete this news post?')) return;
    try {
      const res = await axios.post('/api/student/clubs', {
        action: 'delete_news',
        club_id: selectedClubId,
        news_id: newsId
      });
      toast.success(res.data.message || 'News deleted');
      fetchStudentClubs();
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading club details...</p>
      </div>
    );
  }

  if (!isClubMember || clubs.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-3">
            <FiAlertCircle className="text-3xl text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Not Enrolled in Any Club</h2>
          <p className="text-slate-400 text-xs max-w-xs">You are not currently registered as an active member of any student club.</p>
        </div>
      </div>
    );
  }

  const isModerator = currentClub?.student_role === 'moderator';

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <FiUsers className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{currentClub?.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isModerator 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {isModerator ? 'Club Moderator' : 'Club Member'}
                </span>
              </div>
              {currentClub?.motto && (
                <p className="text-xs italic text-emerald-600 font-medium mt-0.5">"{currentClub.motto}"</p>
              )}
            </div>
          </div>
        </div>

        {clubs.length > 1 && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
          >
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Notice Info & Moderator News Publisher */}
        <div className="flex flex-col gap-6">
          
          {/* Member Notice Card */}
          <div className="bg-white border border-slate-200/70 rounded-3xl p-6 shadow-xs flex flex-col gap-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FiInfo className="text-emerald-600" /> Club Notice & Announcements
            </h2>
            {currentClub?.notice_info ? (
              <div
                className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/60 p-4 rounded-2xl whitespace-pre-wrap font-medium"
                dangerouslySetInnerHTML={{ __html: currentClub.notice_info }}
              />
            ) : (
              <p className="text-xs text-slate-400 py-3">No active notice posted for members.</p>
            )}
          </div>

          {/* Moderator Form if role === 'moderator' */}
          {isModerator && (
            <div className="bg-white border border-slate-200/70 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FiFileText className="text-emerald-600" /> {editingNewsId ? 'Edit Article' : 'Publish Article'}
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

              <form onSubmit={handleSaveNews} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Article Title..."
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
                />

                <textarea
                  rows={4}
                  placeholder="Article Content..."
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none resize-none"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100"
                />

                <button
                  type="submit"
                  disabled={savingNews}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {savingNews ? 'Publishing...' : editingNewsId ? 'Update Article' : 'Publish Article'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: News Posts List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200/70 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
              Club News & Activity Posts
            </h2>

            <div className="flex flex-col gap-4">
              {currentClub?.news?.map(item => (
                <div key={item.id} className="p-5 bg-slate-50/60 rounded-2xl border border-slate-200/60 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                    {isModerator && (
                      <div className="flex gap-2">
                        <button onClick={() => handleEditNewsClick(item)} className="p-1 text-slate-400 hover:text-slate-700">
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button onClick={() => handleDeleteNews(item.id)} className="p-1 text-slate-400 hover:text-rose-600">
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>
              ))}

              {(!currentClub?.news || currentClub.news.length === 0) && (
                <p className="text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded-2xl">
                  No news articles published yet.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentClubsDashboardPage;

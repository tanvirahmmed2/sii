'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiInfo, FiSave, FiAlertCircle } from 'react-icons/fi';


const TeacherClubNoticePage = () => {
  const [loading, setLoading] = useState(true);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [savingNotice, setSavingNotice] = useState(false);

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
        setNoticeText(firstClub.notice_info || '');
      } else {
        setIsClubAdmin(false);
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
      setNoticeText(currentClub.notice_info || '');
    }
  }, [selectedClubId]);

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!selectedClubId) return;

    setSavingNotice(true);
    try {
      const res = await axios.post('/api/teacher/clubs', {
        action: 'update_notice',
        club_id: selectedClubId,
        notice_info: noticeText
      });
      toast.success(res.data.message || 'Notice updated successfully!');
      fetchTeacherClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update notice');
    } finally {
      setSavingNotice(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading Notice Manager...</span>
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

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 max-w-3xl">
        <div className="space-y-1 border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FiInfo className="text-primary" /> Club Notice Board (Members Only)
          </h2>
          <p className="text-xs text-slate-500">
            Write or edit notice information for <span className="font-semibold text-slate-700">{currentClub?.name}</span>. Notices are strictly private to club members, moderators, and admins.
          </p>
        </div>

        <form onSubmit={handleSaveNotice} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Notice Content
            </label>
            <textarea
              rows={8}
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none resize-none font-normal leading-relaxed focus:bg-white focus:border-slate-400"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingNotice}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FiSave /> {savingNotice ? 'Saving Notice...' : 'Save & Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherClubNoticePage;

'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiUsers, FiFileText, FiInfo, FiArrowRight, FiAlertCircle,
  FiUserCheck, FiCalendar, FiEdit2
} from 'react-icons/fi';


const TeacherClubsOverviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');

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
      toast.error('Failed to load club admin details.');
    } finally {
      setLoading(false);
    }
  };

  const currentClub = clubs.find(c => String(c.id) === String(selectedClubId));

  if (loading) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading Club Overview...</span>
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

  const membersList = currentClub?.members || [];
  const newsList = currentClub?.news || [];
  const memberCount = membersList.length;
  const moderatorCount = membersList.filter(m => m.role === 'moderator').length;

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

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
          <p className="text-2xl font-semibold text-slate-900">{memberCount}</p>
          <p className="text-xs text-primary font-semibold">{moderatorCount} Designated Moderators</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published Articles</span>
          <p className="text-2xl font-semibold text-slate-900">{newsList.length}</p>
          <p className="text-xs text-slate-500 font-medium">Club News &amp; Updates</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Club Notice Status</span>
          <p className="text-sm font-bold text-slate-800 truncate mt-1">
            {currentClub?.notice_info ? 'Active Member Notice' : 'No Notice Drafted'}
          </p>
          <p className="text-[11px] text-slate-500">Restricted to Members</p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Notice Info Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all shadow-xs group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-light flex items-center justify-center text-primary text-lg group-hover:scale-105 transition-transform">
              <FiInfo />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors">
              Notice Information
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Draft or update announcements visible exclusively to members and moderators.
            </p>
          </div>
          <Link
            href="/teacher/clubs/notice"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary pt-2"
          >
            <span>Edit Notice Info</span>
            <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* 2. Members & Roles Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all shadow-xs group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-light flex items-center justify-center text-primary text-lg group-hover:scale-105 transition-transform">
              <FiUsers />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors">
              Members &amp; Roles
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Add student members, toggle Moderator permissions, and update student designations.
            </p>
          </div>
          <Link
            href="/teacher/clubs/members"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary pt-2"
          >
            <span>Manage Roster &amp; Roles</span>
            <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* 3. Club News Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all shadow-xs group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-light flex items-center justify-center text-primary text-lg group-hover:scale-105 transition-transform">
              <FiFileText />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors">
              Club News &amp; Updates
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Publish news posts with cover photos and manage club activity articles.
            </p>
          </div>
          <Link
            href="/teacher/clubs/news"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary pt-2"
          >
            <span>Publish &amp; Manage News</span>
            <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

      </div>

      {/* Bottom Previews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Members Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FiUsers /> Members Preview
            </h3>
            <Link href="/teacher/clubs/members" className="text-xs font-bold text-primary hover:underline">
              View All ({memberCount})
            </Link>
          </div>

          <div className="space-y-2">
            {membersList.slice(0, 4).map(m => (
              <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{m.student_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Reg: {m.registration_number}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  m.role === 'moderator' ? 'bg-primary-light text-primary' : 'bg-slate-200 text-slate-700'
                }`}>
                  {m.role === 'moderator' ? 'Moderator' : 'Member'}
                </span>
              </div>
            ))}
            {membersList.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">No members added to this club yet.</p>
            )}
          </div>
        </div>

        {/* Recent News Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FiFileText /> Recent News Posts
            </h3>
            <Link href="/teacher/clubs/news" className="text-xs font-bold text-primary hover:underline">
              Manage News ({newsList.length})
            </Link>
          </div>

          <div className="space-y-2">
            {newsList.slice(0, 3).map(n => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                <h4 className="font-bold text-slate-800 line-clamp-1">{n.title}</h4>
                <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">{n.content}</p>
              </div>
            ))}
            {newsList.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">No news posts published yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherClubsOverviewPage;

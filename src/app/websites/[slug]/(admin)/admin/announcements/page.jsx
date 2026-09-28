'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiBell, FiPlus, FiClock } from 'react-icons/fi';
import AnnouncementForm from '@/component/forms/AnnouncementForm';

const AdminAnnouncementsPage = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/announcements');
      const active = response.data.paylod.announcement;
      setAnnouncement(active);
    } catch (error) {
      toast.error('Failed to load active announcement.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formValues) => {
    setSubmitting(true);
    try {
      if (announcement) {
        const response = await axios.put('/api/announcements', formValues);
        toast.success(response.data.message || 'Announcement updated successfully!');
      } else {
        const response = await axios.post('/api/announcements', formValues);
        toast.success(response.data.message || 'Announcement published successfully!');
      }
      fetchAnnouncement();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to remove the current announcement?');
    if (!confirm) return;

    try {
      const response = await axios.delete('/api/announcements');
      toast.success(response.data.message || 'Announcement deleted.');
      setAnnouncement(null);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiBell className="text-amber-600 animate-bounce" /> Homepage Broadcast Announcement
        </h1>
        <p className="text-sm text-slate-500">
          Publish a single, active announcement modal shown to visitors as a popup upon entering the portal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form panel */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiPlus className="text-amber-600" /> 
            {announcement ? 'Manage Active Broadcast' : 'Create New Broadcast'}
          </h2>

          <AnnouncementForm
            initialData={announcement}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            submitting={submitting}
          />
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
            <h2 className="text-base font-bold text-slate-800 mb-4">Live Preview Status</h2>
            {loading ? (
              <div className="py-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : announcement ? (
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-3">
                <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${new Date(announcement.expires_at) > new Date() ? 'text-amber-600' : 'text-rose-600'}`}>
                  <FiBell /> {new Date(announcement.expires_at) > new Date() ? 'Active Broadcast' : 'Expired Broadcast'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-850">{announcement.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-1">
                    <FiClock /> Expires: {new Date(announcement.expires_at).toLocaleString()}
                  </p>
                </div>
                <div 
                  className="text-xs text-slate-600 leading-relaxed prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: announcement.description }}
                />
                {announcement.location && (
                  <div className="border-t border-slate-100 pt-2 flex flex-col gap-1 text-[11px] text-slate-500">
                    <div><strong>Location:</strong> {announcement.location}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                <span className="text-2xl">📭</span>
                <p className="text-xs font-semibold text-slate-400 mt-2">No Active Announcement</p>
                <p className="text-[10px] text-slate-400 px-4 mt-0.5">
                  Use the editor to publish a notice to all visitors.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;

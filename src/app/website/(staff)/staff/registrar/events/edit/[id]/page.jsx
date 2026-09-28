'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiCalendar, FiCheck } from 'react-icons/fi';

const RegistrarEditEventPage = () => {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/events/${id}`);
        const item = res.data?.paylod?.event;
        if (item) {
          setTitle(item.title || '');
          setDescription(item.description || '');
          if (item.event_date) {
            const d = new Date(item.event_date);
            const isoStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setEventDate(isoStr);
          }
          setLocation(item.location || '');
          setImagePreview(item.image || '');
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        toast.error('Failed to load event details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEvent();
  }, [id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !eventDate || !location) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        event_date: eventDate,
        location,
        image,
      };

      await axios.put(`/api/events/${id}`, payload);
      toast.success('Event updated successfully!');
      router.push('/staff/registrar/events');
    } catch (err) {
      console.error('Error updating event:', err);
      toast.error(err.response?.data?.message || 'Failed to update event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 p-8 flex items-center justify-center">
        <div className="text-slate-500 font-semibold text-sm">Loading event information...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/staff/registrar/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Events</span>
          </Link>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3 py-1 rounded-full w-fit mb-1">
              <FiCalendar /> Registrar Desk
            </div>
            <h1 className="text-xl font-bold text-slate-900">Update Event Details</h1>
            <p className="text-slate-500 text-xs mt-1">Modify event specifications, schedule, location, or update poster image.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Event Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Location / Venue *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Event Description *
              </label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Event Poster Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-light cursor-pointer"
              />
              {imagePreview && (
                <div className="mt-3 relative w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                href="/staff/registrar/events"
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <FiCheck />
                <span>{submitting ? 'Updating...' : 'Update Event'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrarEditEventPage;

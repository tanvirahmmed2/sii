'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiAward, FiList, FiLoader } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import TiptapEditor from '@/component/helper/TiptapEditor';

const EditRecognitionPage = () => {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    awarded_by: '',
    date: '',
    description: '',
    image: '',
  });

  useEffect(() => {
    if (!id) return;
    const fetchRecognition = async () => {
      try {
        const res = await fetch(`/api/recognitions/${id}`);
        if (!res.ok) {
          toast.error('Recognition not found.');
          router.push('/admin/recognition/list');
          return;
        }
        const data = await res.json();
        const r = data.paylod.recognition;
        setFormData({
          name: r.name || '',
          awarded_by: r.awarded_by || '',
          date: r.date ? r.date.split('T')[0] : '',
          description: r.description || '',
          image: '',
        });
        if (r.image) setImagePreview(r.image);
      } catch (err) {
        console.error('Error loading recognition:', err);
        toast.error('Failed to load recognition.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecognition();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, image: reader.result }));
      setImagePreview(reader.result);
    };
    reader.onerror = () => toast.error('Failed to read image file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.awarded_by || !formData.date) {
      toast.error('Name, awarded by, and date are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/recognitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update recognition.');
      toast.success(data.message || 'Recognition updated successfully.');
      router.push('/admin/recognition/list');
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Edit Recognition
          </h1>
        </div>
        <Link
          href="/admin/recognition/list"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <FiList />
          <span>Back to List</span>
        </Link>
      </div>

      {/* Form */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <FiAward className="text-primary text-xl" /> Recognition Entry Details
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Recognition / Award Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none transition-colors"
              />
            </div>

            {/* Awarded By */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Awarded By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="awarded_by"
                value={formData.awarded_by}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none transition-colors"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Award Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none transition-colors"
              />
            </div>

            {/* Image */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Award / Certificate Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-primary hover:file:bg-emerald-50 cursor-pointer"
              />
              {imagePreview && (
                <div className="w-24 h-24 relative rounded-xl overflow-hidden border border-slate-100 mt-1">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Description
              </label>
              <TiptapEditor
                value={formData.description}
                onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-50">
            <Link
              href="/admin/recognition/list"
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRecognitionPage;

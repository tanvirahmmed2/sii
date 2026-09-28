'use client';

import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiUserPlus,  FiUpload, FiArrowLeft, FiCamera } from 'react-icons/fi';
import Link from 'next/link';
import { Context } from '@/component/helper/Context';
import Image from 'next/image';



export default function NewAuthorityPage() {
  const { designations } = useContext(Context);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    designation: 'chairman',
    email: '',
    contact: '',
    image: ''
  });
  const [preview, setPreview] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setFormData(prev => ({
        ...prev,
        image: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.designation) {
      toast.error('Name and Designation are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/authorities', formData);
      toast.success(res.data.message || 'Board member onboarded successfully!');
      router.push('/admin/authorities/list');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 pb-2 border-b border-slate-200/60">
        <Link 
          href="/admin/authorities/list"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <FiArrowLeft className="text-xs" /> Back to Board Registry
        </Link>

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiUserPlus className="text-primary" /> Onboard Board Member
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-register leadership designations, contact details, bios, and upload profile photos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-2xs flex flex-col gap-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200 bg-white shadow-2xs flex items-center justify-center text-slate-400 font-bold">
              {preview ? (
                <Image width={500} height={500} src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <FiCamera className="text-2xl text-slate-400" />
              )}
            </div>
            
            <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all">
              <FiUpload className="text-xs" /> Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-slate-400 mt-1">JPEG, PNG or WEBP. Max 2MB.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Official Designation *
              </label>
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
                required
              >
                {designations && designations.length > 0 ? (
                  designations.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))
                ) : (
                  designations.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Contact Phone
              </label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Profile Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="border-t border-slate-100 pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Onboarding...' : 'Onboard Member'}
          </button>
        </div>
      </form>
    </div>
  );
}

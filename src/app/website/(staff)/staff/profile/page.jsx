'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiCheckCircle,
  FiShield, FiSave, FiCalendar, FiGlobe, FiDroplet, FiStar,
  FiBriefcase, FiClock, FiPlus, FiTrash2, FiEdit2, FiCamera, FiAtSign
} from 'react-icons/fi';
import axios from 'axios';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];

const StaffExperienceForm = ({ initial = {}, onSave, onCancel, loading }) => {
  const [form, setForm] = useState({
    title: initial.title || '',
    organization: initial.organization || '',
    start_date: initial.start_date ? initial.start_date.split('T')[0] : '',
    end_date: initial.end_date ? initial.end_date.split('T')[0] : '',
    is_current: initial.is_current || false,
    description: initial.description || '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.organization) {
      toast.error('Title and organization are required.');
      return;
    }
    onSave({ ...initial, ...form });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organization *</label>
          <input name="organization" value={form.organization} onChange={handleChange} required
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
          <input type="date" name="start_date" value={form.start_date} onChange={handleChange}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
          <input type="date" name="end_date" value={form.end_date} onChange={handleChange} disabled={form.is_current}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="is_current" checked={form.is_current} onChange={handleChange} className="accent-emerald-600" />
        <span className="text-xs text-slate-600 font-medium">Currently working here</span>
      </label>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description (optional)</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={2}
          className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60">
          {loading ? 'Saving...' : initial.id ? 'Update Experience' : 'Add Experience'}
        </button>
      </div>
    </form>
  );
};

const StaffProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: '', phone: '', address: '', date_of_birth: '', nationality: '', blood_group: '', gender: '', nid_number: '', bio: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Experiences State
  const [experiences, setExperiences] = useState([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [expLoading, setExpLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/staff/me');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff profile.');
      }
      const staffData = data.paylod?.staff;
      if (staffData) {
        setProfile(staffData);
        setProfileData({
          name: staffData.name || '',
          phone: staffData.phone || '',
          address: staffData.address || '',
          date_of_birth: staffData.date_of_birth ? staffData.date_of_birth.split('T')[0] : '',
          nationality: staffData.nationality || '',
          blood_group: staffData.blood_group || '',
          gender: staffData.gender || '',
          nid_number: staffData.nid_number || '',
          bio: staffData.bio || ''
        });
        setIsTwoFactorEnabled(Boolean(staffData.is_two_factor_enabled));
        setExperiences(staffData.experiences || []);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const toastId = toast.loading('Uploading picture...');
      try {
        const res = await axios.put('/api/staff/me', { image: reader.result });
        toast.dismiss(toastId); toast.success('Profile picture updated!');
        setProfile(res.data.paylod.staff);
      } catch (err) { toast.dismiss(toastId); toast.error('Failed to upload.'); }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const response = await fetch('/api/staff/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile.');

      toast.success(data.message || 'Profile updated successfully!');
      if (data.paylod?.staff) setProfile(data.paylod.staff);
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleToggle2FA = async (newValue) => {
    setToggling2FA(true);
    try {
      const response = await fetch('/api/staff/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_two_factor_enabled: newValue }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update 2FA status.');

      setIsTwoFactorEnabled(newValue);
      toast.success(newValue ? '2FA Enabled!' : '2FA Disabled!');
      if (data.paylod?.staff) setProfile(data.paylod.staff);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling2FA(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch('/api/staff/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update password.');

      toast.success(data.message || 'Password updated successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Experience Handlers
  const handleExpSave = async (formData) => {
    setExpLoading(true);
    try {
      if (formData.id) {
        const res = await axios.put('/api/staff/experiences', formData);
        setExperiences((prev) => prev.map((e) => e.id === formData.id ? res.data.paylod.experience : e));
        toast.success('Experience updated.');
      } else {
        const res = await axios.post('/api/staff/experiences', formData);
        setExperiences((prev) => [res.data.paylod.experience, ...prev]);
        toast.success('Experience added.');
      }
      setShowExpForm(false); setEditingExp(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save experience.');
    } finally {
      setExpLoading(false);
    }
  };

  const handleExpDelete = async (id) => {
    if (!window.confirm('Delete this experience?')) return;
    try {
      await axios.delete(`/api/staff/experiences?id=${id}`);
      setExperiences((prev) => prev.filter((e) => e.id !== id));
      toast.success('Experience removed.');
    } catch (err) {
      toast.error('Failed to remove.');
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading staff profile...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <div className="relative group w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-2xl shadow-xs overflow-hidden shrink-0">
            {profile?.image ? (
              <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              profile?.name ? profile.name.charAt(0).toUpperCase() : <FiUser />
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <FiCamera className="text-sm" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{profile?.name}</h1>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 capitalize">
                <FiCheckCircle className="text-xs" /> {profile?.role || 'Staff Member'}
              </span>
            </div>
            {profile?.username && <p className="text-xs font-mono text-slate-400 mt-0.5">@{profile.username}</p>}
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><FiMail /> {profile?.email}</span>
            </p>
          </div>
        </div>
        <button onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shrink-0">
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </button>
      </div>

      {/* Edit / View Details */}
      {isEditing ? (
        <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Edit Staff Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', name: 'name', type: 'text' },
              { label: 'Phone Number', name: 'phone', type: 'text' },
              { label: 'Date of Birth', name: 'date_of_birth', type: 'date' },
              { label: 'NID Number', name: 'nid_number', type: 'text' },
              { label: 'Nationality', name: 'nationality', type: 'text' },
            ].map(({ label, name, type }) => (
              <div key={name} className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <input type={type} name={name} value={profileData[name]} onChange={(e) => setProfileData({ ...profileData, [name]: e.target.value })}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
              <select name="gender" value={profileData.gender} onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="">Select Gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
              <select name="blood_group" value={profileData.blood_group} onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Address</label>
              <input type="text" name="address" value={profileData.address} onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bio</label>
              <textarea name="bio" rows={3} value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={updatingProfile} className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60">
            <FiSave /> {updatingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      ) : (
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Profile Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: FiMail, label: 'Email', value: profile?.email },
              { icon: FiPhone, label: 'Phone', value: profile?.phone },
              { icon: FiCalendar, label: 'Date of Birth', value: profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
              { icon: FiUser, label: 'Gender', value: profile?.gender },
              { icon: FiDroplet, label: 'Blood Group', value: profile?.blood_group },
              { icon: FiGlobe, label: 'Nationality', value: profile?.nationality },
              { icon: FiAtSign, label: 'NID Number', value: profile?.nid_number },
              { icon: FiMapPin, label: 'Address', value: profile?.address },
            ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3 bg-slate-50/70 rounded-2xl">
                <Icon className="text-emerald-600 text-sm mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
            {profile?.bio && (
              <div className="sm:col-span-2 flex items-start gap-3 p-3 bg-slate-50/70 rounded-2xl">
                <FiUser className="text-emerald-600 text-sm mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bio</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security & 2FA */}
      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><FiShield className="text-emerald-600" /> Two-Factor Authentication</h2>
          <p className="text-xs text-slate-400 mt-0.5">{isTwoFactorEnabled ? '2FA is active — Protecting your account logins.' : '2FA is disabled.'}</p>
        </div>
        <button onClick={() => handleToggle2FA(!isTwoFactorEnabled)} disabled={toggling2FA}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-60 ${isTwoFactorEnabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
          {toggling2FA ? 'Updating...' : isTwoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </div>

      {/* Update Password */}
      <form onSubmit={handleUpdatePassword} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><FiLock className="text-emerald-600" /> Update Password</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Current Password', value: currentPassword, setter: setCurrentPassword },
            { label: 'New Password', value: newPassword, setter: setNewPassword },
            { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword }
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
              <input type="password" value={value} onChange={(e) => setter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
          ))}
        </div>
        <button type="submit" disabled={updatingPassword} className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60">
          <FiLock /> {updatingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* Experiences */}
      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><FiStar className="text-emerald-600" /> Work Experience ({experiences.length})</h2>
          <button onClick={() => { setShowExpForm(!showExpForm); setEditingExp(null); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
            <FiPlus /> Add
          </button>
        </div>

        {showExpForm && !editingExp && (
          <StaffExperienceForm onSave={handleExpSave} onCancel={() => setShowExpForm(false)} loading={expLoading} />
        )}

        {experiences.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">No experience entries added yet.</div>
        ) : (
          <div className="space-y-2">
            {experiences.map((exp) => (
              <div key={exp.id}>
                {editingExp?.id === exp.id ? (
                  <StaffExperienceForm initial={exp} onSave={handleExpSave} onCancel={() => setEditingExp(null)} loading={expLoading} />
                ) : (
                  <div className="flex items-start justify-between p-4 bg-slate-50/70 border border-slate-200/60 rounded-2xl hover:bg-white transition-all gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">{exp.title}</p>
                        {exp.is_current && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-full">Current</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><FiBriefcase className="text-[10px]" /> {exp.organization}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <FiClock className="text-[10px]" /> {formatDate(exp.start_date)} – {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                      </p>
                      {exp.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{exp.description}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => { setEditingExp(exp); setShowExpForm(false); }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><FiEdit2 className="text-xs" /></button>
                      <button onClick={() => handleExpDelete(exp.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 className="text-xs" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProfilePage;

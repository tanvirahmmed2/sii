'use client';

import React, { useEffect, useState } from 'react';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiAward, FiBookOpen,
  FiPlus, FiTrash2, FiEdit2, FiX, FiCamera, FiShield, FiLock,
  FiGlobe, FiDroplet, FiCalendar, FiStar, FiBriefcase, FiClock,
  FiSave, FiAtSign
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import TiptapEditor from '@/component/helper/TiptapEditor';
import RichTextDisplay from '@/component/helper/RichTextDisplay';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];

const ExperienceForm = ({ initial = {}, onSave, onCancel, loading }) => {
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
    if (!form.title || !form.organization) { toast.error('Title and organization are required.'); return; }
    onSave({ ...initial, ...form });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organization *</label>
          <input name="organization" value={form.organization} onChange={handleChange} required
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
          <input type="date" name="start_date" value={form.start_date} onChange={handleChange}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
          <input type="date" name="end_date" value={form.end_date} onChange={handleChange} disabled={form.is_current}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="is_current" checked={form.is_current} onChange={handleChange} className="accent-primary" />
        <span className="text-xs text-slate-600 font-medium">Currently working here</span>
      </label>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description (optional)</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={2}
          className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
          {loading ? 'Saving...' : initial.id ? 'Update Experience' : 'Add Experience'}
        </button>
      </div>
    </form>
  );
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '', number: '', address: '',
    date_of_birth: '', nationality: '', blood_group: '', gender: '', nid_number: '', bio: ''
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  // Qualifications
  const [qualifications, setQualifications] = useState([]);
  const [showQualForm, setShowQualForm] = useState(false);
  const [qualFormLoading, setQualFormLoading] = useState(false);
  const [editQualId, setEditQualId] = useState(null);
  const [qualFormData, setQualFormData] = useState({ degree: '', institution: '', passing_year: '', result: '' });

  // Experiences
  const [experiences, setExperiences] = useState([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [expFormLoading, setExpFormLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/teacher/me');
      if (res.ok) {
        const data = await res.json();
        const teacher = data.paylod.teacher;
        setProfile(teacher);
        setProfileData({
          name: teacher.name || '',
          number: teacher.number || '',
          address: teacher.address || '',
          date_of_birth: teacher.date_of_birth ? teacher.date_of_birth.split('T')[0] : '',
          nationality: teacher.nationality || '',
          blood_group: teacher.blood_group || '',
          gender: teacher.gender || '',
          nid_number: teacher.nid_number || '',
          bio: teacher.bio || ''
        });
        setIsTwoFactorEnabled(Boolean(teacher.is_two_factor_enabled));
        setExperiences(teacher.experiences || []);
        fetchQualifications(teacher.id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const fetchQualifications = async (teacherId) => {
    try {
      const res = await fetch(`/api/teachers/qualifications?teacher_id=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setQualifications(data.paylod.qualifications || []);
      }
    } catch (err) { console.error('Error fetching qualifications:', err); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const toastId = toast.loading('Uploading picture...');
      try {
        const res = await axios.put('/api/teacher/me', { image: reader.result });
        toast.dismiss(toastId); toast.success('Profile picture updated!');
        setProfile(res.data.paylod.teacher);
      } catch (err) { toast.dismiss(toastId); toast.error('Failed to upload.'); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await axios.put('/api/teacher/me', profileData);
      toast.success('Profile updated successfully.');
      setProfile(res.data.paylod.teacher); setIsEditing(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save.'); }
    finally { setSavingProfile(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error('Passwords do not match.'); return; }
    if (passwordForm.new_password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setSavingPassword(true);
    try {
      await axios.put('/api/teacher/me', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password updated successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update password.'); }
    finally { setSavingPassword(false); }
  };

  const handleToggle2FA = async (newValue) => {
    setToggling2FA(true);
    try {
      const res = await axios.put('/api/teacher/me', { is_two_factor_enabled: newValue });
      setIsTwoFactorEnabled(newValue);
      setProfile(res.data.paylod.teacher);
      toast.success(newValue ? '2FA Enabled!' : '2FA Disabled!');
    } catch (err) { toast.error('Failed to update 2FA status.'); }
    finally { setToggling2FA(false); }
  };

  // Qualification handlers
  const handleQualSubmit = async (e) => {
    e.preventDefault();
    if (!qualFormData.degree.trim() || !qualFormData.institution.trim() || !qualFormData.passing_year) {
      toast.error('Degree, Institution and Passing Year are required.'); return;
    }
    setQualFormLoading(true);
    try {
      if (editQualId) {
        await axios.put(`/api/teachers/qualifications/${editQualId}`, qualFormData);
        toast.success('Qualification updated.'); setEditQualId(null);
      } else {
        await axios.post('/api/teachers/qualifications', { teacher_id: profile.id, ...qualFormData });
        toast.success('Qualification added.');
      }
      setQualFormData({ degree: '', institution: '', passing_year: '', result: '' });
      setShowQualForm(false);
      fetchQualifications(profile.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save.'); }
    finally { setQualFormLoading(false); }
  };

  const handleQualDelete = async (id) => {
    if (!window.confirm('Delete this qualification?')) return;
    try {
      await axios.delete(`/api/teachers/qualifications/${id}`);
      toast.success('Qualification removed.'); fetchQualifications(profile.id);
    } catch (err) { toast.error('Failed to remove.'); }
  };

  // Experience handlers
  const handleExpSave = async (formData) => {
    setExpFormLoading(true);
    try {
      if (formData.id) {
        const res = await axios.put('/api/teacher/experiences', formData);
        setExperiences((prev) => prev.map((e) => e.id === formData.id ? res.data.paylod.experience : e));
        toast.success('Experience updated.');
      } else {
        const res = await axios.post('/api/teacher/experiences', formData);
        setExperiences((prev) => [res.data.paylod.experience, ...prev]);
        toast.success('Experience added.');
      }
      setShowExpForm(false); setEditingExp(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save experience.'); }
    finally { setExpFormLoading(false); }
  };

  const handleExpDelete = async (id) => {
    if (!window.confirm('Delete this experience?')) return;
    try {
      await axios.delete(`/api/teacher/experiences?id=${id}`);
      setExperiences((prev) => prev.filter((e) => e.id !== id));
      toast.success('Experience removed.');
    } catch (err) { toast.error('Failed to remove.'); }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="w-full py-16 text-center text-xs text-slate-400">Loading profile...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-12">

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative group w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 border-slate-200 bg-slate-100">
          {profile?.image ? (
            <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-bold">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'T'}
            </div>
          )}
          <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <FiCamera className="text-base" />
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-base font-bold text-slate-800">{profile?.name}</h2>
          {profile?.username && <p className="text-[11px] text-slate-400 font-mono">@{profile.username}</p>}
          <p className="text-xs text-slate-500 mt-0.5">{profile?.designation || 'Teacher'}</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-semibold">
              {profile?.is_permanent ? 'Permanent' : 'Contract'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isTwoFactorEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
              <FiShield className="inline text-[9px] mr-0.5" /> {isTwoFactorEnabled ? '2FA Active' : '2FA Off'}
            </span>
          </div>
        </div>
        <button onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity shrink-0">
          {isEditing ? <><FiX /> Cancel</> : <><FiEdit2 /> Edit Profile</>}
        </button>
      </div>

      {/* Edit / View Contact Details */}
      {isEditing ? (
        <form onSubmit={handleSaveDetails} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Edit Profile Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', name: 'name', type: 'text' },
              { label: 'Phone Number', name: 'number', type: 'text' },
              { label: 'Date of Birth', name: 'date_of_birth', type: 'date' },
              { label: 'NID Number', name: 'nid_number', type: 'text' },
              { label: 'Nationality', name: 'nationality', type: 'text' },
            ].map(({ label, name, type }) => (
              <div key={name} className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <input type={type} name={name} value={profileData[name]} onChange={(e) => setProfileData({ ...profileData, [name]: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
              <select name="gender" value={profileData.gender} onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select Gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
              <select name="blood_group" value={profileData.blood_group} onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Address</label>
              <input type="text" name="address" value={profileData.address} onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bio</label>
              <textarea name="bio" rows={3} value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
            <FiSave /> {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Profile Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: FiMail, label: 'Email', value: profile?.email },
              { icon: FiPhone, label: 'Phone', value: profile?.number },
              { icon: FiCalendar, label: 'Date of Birth', value: profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
              { icon: FiUser, label: 'Gender', value: profile?.gender },
              { icon: FiDroplet, label: 'Blood Group', value: profile?.blood_group },
              { icon: FiGlobe, label: 'Nationality', value: profile?.nationality },
              { icon: FiAtSign, label: 'NID Number', value: profile?.nid_number },
              { icon: FiMapPin, label: 'Address', value: profile?.address },
            ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 bg-slate-50/70 rounded-lg">
                <Icon className="text-primary text-xs mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
            {profile?.bio && (
              <div className="sm:col-span-2 flex items-start gap-2.5 p-3 bg-slate-50/70 rounded-lg">
                <FiUser className="text-primary text-xs mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bio</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2FA Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><FiShield className="text-emerald-600" /> Two-Factor Authentication</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{isTwoFactorEnabled ? 'Enabled — Your account is protected with 2FA.' : 'Disabled — Enable for extra account security.'}</p>
        </div>
        <button onClick={() => handleToggle2FA(!isTwoFactorEnabled)} disabled={toggling2FA}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 ${isTwoFactorEnabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
          {toggling2FA ? 'Updating...' : isTwoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </div>

      {/* Change Password */}
      <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-2"><FiLock className="text-primary" /> Change Password</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Current Password', name: 'current_password' },
            { label: 'New Password', name: 'new_password' },
            { label: 'Confirm New Password', name: 'confirm_password' }
          ].map(({ label, name }) => (
            <div key={name} className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
              <input type="password" value={passwordForm[name]} onChange={(e) => setPasswordForm({ ...passwordForm, [name]: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
        <button type="submit" disabled={savingPassword} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
          <FiLock /> {savingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* Qualifications */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><FiAward className="text-primary" /> Qualifications ({qualifications.length})</h3>
          <button onClick={() => { setShowQualForm(!showQualForm); setEditQualId(null); setQualFormData({ degree: '', institution: '', passing_year: '', result: '' }); }}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded-lg hover:opacity-90 transition-opacity">
            <FiPlus /> Add
          </button>
        </div>

        {showQualForm && (
          <form onSubmit={handleQualSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Degree/Certificate *', name: 'degree' },
                { label: 'Institution *', name: 'institution' },
                { label: 'Passing Year *', name: 'passing_year' },
                { label: 'Result/GPA', name: 'result' }
              ].map(({ label, name }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                  <input value={qualFormData[name]} onChange={(e) => setQualFormData({ ...qualFormData, [name]: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowQualForm(false); setEditQualId(null); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={qualFormLoading} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-60">
                {qualFormLoading ? 'Saving...' : editQualId ? 'Update' : 'Add Qualification'}
              </button>
            </div>
          </form>
        )}

        {qualifications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">No qualifications added yet.</div>
        ) : (
          <div className="space-y-2">
            {qualifications.map((q) => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl hover:bg-white transition-all">
                <div>
                  <p className="text-xs font-bold text-slate-800">{q.degree}</p>
                  <p className="text-[11px] text-slate-500">{q.institution} · {q.passing_year}{q.result ? ` · ${q.result}` : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditQualId(q.id); setQualFormData({ degree: q.degree, institution: q.institution, passing_year: q.passing_year, result: q.result || '' }); setShowQualForm(true); }}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><FiEdit2 className="text-xs" /></button>
                  <button onClick={() => handleQualDelete(q.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 className="text-xs" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Experiences */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><FiStar className="text-primary" /> Work Experience ({experiences.length})</h3>
          <button onClick={() => { setShowExpForm(!showExpForm); setEditingExp(null); }}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded-lg hover:opacity-90 transition-opacity">
            <FiPlus /> Add
          </button>
        </div>

        {showExpForm && !editingExp && (
          <ExperienceForm onSave={handleExpSave} onCancel={() => setShowExpForm(false)} loading={expFormLoading} />
        )}

        {experiences.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">No experience entries added yet.</div>
        ) : (
          <div className="space-y-2">
            {experiences.map((exp) => (
              <div key={exp.id}>
                {editingExp?.id === exp.id ? (
                  <ExperienceForm initial={exp} onSave={handleExpSave} onCancel={() => setEditingExp(null)} loading={expFormLoading} />
                ) : (
                  <div className="flex items-start justify-between p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl hover:bg-white transition-all gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">{exp.title}</p>
                        {exp.is_current && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-full">Current</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><FiBriefcase className="text-[10px]" /> {exp.organization}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <FiClock className="text-[10px]" /> {formatDate(exp.start_date)} – {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                      </p>
                      {exp.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{exp.description}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => { setEditingExp(exp); setShowExpForm(false); }}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><FiEdit2 className="text-xs" /></button>
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

export default ProfilePage;

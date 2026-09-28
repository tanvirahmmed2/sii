'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiActivity, FiBookOpen, FiMessageSquare } from 'react-icons/fi';
import TiptapEditor from '@/component/helper/TiptapEditor';

const AdminClubsNewPage = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [description, setDescription] = useState('');
  
  const [editId, setEditId] = useState(null);
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImage(null);
    setImagePreview('');
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/clubs');
      setClubs(response.data.paylod.clubs || []);
    } catch (error) {
      toast.error('Failed to load clubs registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      toast.error('Club Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        const response = await axios.put(`/api/clubs/${editId}`, { 
          name, motto, description, image 
        });
        toast.success(response.data.message || 'Club details updated successfully!');
        setEditId(null);
      } else {
        const response = await axios.post('/api/clubs', { 
          name, motto, description, image 
        });
        toast.success(response.data.message || 'Club registered successfully!');
      }

      setName('');
      setMotto('');
      setDescription('');
      setImage('');
      setImagePreview('');
      fetchClubs();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (club) => {
    setEditId(club.id);
    setName(club.name || '');
    setMotto(club.motto || '');
    setDescription(club.description || '');
    setImage('');
    setImagePreview(club.image || '');
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setName('');
    setMotto('');
    setDescription('');
    setImage('');
    setImagePreview('');
  };

  const handleDeleteClub = async (id, clubName) => {
    const confirm = window.confirm(
      `Are you sure you want to delete "${clubName}"? This will permanently delete all logs, assigned admins, registers, and student memberships.`
    );
    if (!confirm) return;

    try {
      const response = await axios.delete(`/api/clubs/${id}`);
      toast.success(response.data.message || 'Club deleted.');
      setClubs(prev => prev.filter(c => c.id !== id));
      if (editId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiActivity className="text-primary" /> Student Clubs &amp; Societies
        </h1>
        <p className="text-sm text-slate-500">
          Create, edit, or remove school club registries, mottos, and co-curricular programs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Form panel */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiPlus className="text-primary" /> 
            {editId ? 'Modify Club Profile' : 'Register New Club'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Club Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FiMessageSquare /> Club Motto
              </label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FiBookOpen /> Description
              </label>
              <TiptapEditor
                value={description}
                onChange={setDescription}
              />
            </div>

            {/* Image upload field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                Club Logo / Image
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  disabled={submitting}
                  onChange={handleImageChange}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-primary hover:file:bg-emerald-50 cursor-pointer w-full"
                />
                {imagePreview && (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs font-bold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              {editId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className={`py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                  editId ? 'bg-primary hover:bg-primary-dark' : 'bg-primary hover:bg-primary-dark w-full'
                } ${editId && 'w-1/2'} disabled:opacity-50`}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : editId ? (
                  'Update Club'
                ) : (
                  'Create Club'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">
              Active Clubs Registry ({clubs.length})
            </h2>
          </div>

          {loading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-slate-400">Loading clubs list...</span>
            </div>
          ) : clubs.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-350 text-5xl mb-3">🎨</span>
              <h3 className="text-sm font-bold text-slate-655">No Clubs Registered</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                Pre-populate school club registries using the form on the left.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Club Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Motto</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clubs.map((club) => (
                    <tr key={club.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                            {club.image ? (
                              <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-primary font-bold text-xs">
                                {club.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span>{club.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-[240px] truncate">
                        {club.motto ? (
                          <span className="font-medium italic text-slate-700">"{club.motto}"</span>
                        ) : (
                          <span className="text-slate-300 italic">No motto</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(club)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-xl transition-colors cursor-pointer"
                          title="Edit & Update Club info"
                        >
                          <FiEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteClub(club.id, club.name)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                          title="Delete Club"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClubsNewPage;

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiHome, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiMapPin, 
  FiLayers, 
  FiGrid, 
  FiCheckCircle, 
  FiUserCheck,
  FiArrowRight,
  FiBookOpen
} from 'react-icons/fi';
import TiptapEditor from '@/component/helper/TiptapEditor';

export default function AdminHostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [seats, setSeats] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [provosts, setProvosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hostel form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalRoom, setTotalRoom] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('Male');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [editId, setEditId] = useState(null);
  const [submittingHostel, setSubmittingHostel] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resH, resR, resS, resA, resP] = await Promise.all([
        axios.get('/api/hostels'),
        axios.get('/api/hostel-rooms'),
        axios.get('/api/hostel-seats'),
        axios.get('/api/hostel-allocations'),
        axios.get('/api/hostel-provost')
      ]);

      setHostels(resH.data.payload?.hostels || resH.data.paylod?.hostels || []);
      setRooms(resR.data.payload?.rooms || resR.data.paylod?.rooms || []);
      setSeats(resS.data.payload?.seats || resS.data.paylod?.seats || []);
      setAllocations(resA.data.payload?.allocations || resA.data.paylod?.allocations || []);
      setProvosts(resP.data.payload?.provosts || resP.data.paylod?.provosts || []);
    } catch (error) {
      toast.error('Failed to load hostel data.');
    } finally {
      setLoading(false);
    }
  };

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
    setImage('');
    setImagePreview('');
  };

  const handleHostelSubmit = async (e) => {
    e.preventDefault();
    if (!name || !location) {
      toast.error('Hostel Name and Location are required.');
      return;
    }

    setSubmittingHostel(true);
    try {
      const payload = {
        name,
        description,
        total_room: totalRoom !== '' ? parseInt(totalRoom, 10) : 0,
        location,
        gender,
        image: image || null
      };

      if (editId) {
        const response = await axios.put(`/api/hostels/${editId}`, payload);
        toast.success(response.data.message || 'Hostel updated successfully!');
      } else {
        const response = await axios.post('/api/hostels', payload);
        toast.success(response.data.message || 'Hostel registered successfully!');
      }

      clearHostelForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmittingHostel(false);
    }
  };

  const clearHostelForm = () => {
    setName('');
    setDescription('');
    setTotalRoom('');
    setLocation('');
    setGender('Male');
    setImage('');
    setImagePreview('');
    setEditId(null);
  };

  const handleEditClick = (hostel) => {
    setEditId(hostel.id);
    setName(hostel.name);
    setDescription(hostel.description || '');
    setTotalRoom(hostel.total_room !== null ? hostel.total_room : '');
    setLocation(hostel.location);
    setGender(hostel.gender || 'Male');
    setImage(hostel.image || '');
    setImagePreview(hostel.image || '');
  };

  const handleDeleteHostel = async (id, hostelName) => {
    const confirm = window.confirm(`Are you sure you want to delete "${hostelName}"? This will permanently delete all associated rooms, seats, and allocations.`);
    if (!confirm) return;

    try {
      const response = await axios.delete(`/api/hostels/${id}`);
      toast.success(response.data.message || 'Hostel deleted.');
      fetchData();
      if (editId === id) clearHostelForm();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiHome className="text-primary" /> Hostels & Residential Halls Overview
        </h1>
        <p className="text-sm text-slate-500">
          Manage campus halls of residence, floor rooms, room seats, allocations, and provost assignments.
        </p>
      </div>

      {/* Navigation Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/hostels/rooms"
          className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:border-primary transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              <FiGrid />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Rooms & Seats</div>
              <div className="text-xs font-semibold text-slate-400">{rooms.length} rooms / {seats.length} seats</div>
            </div>
          </div>
          <FiArrowRight className="text-slate-400 group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/admin/hostels/applications"
          className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:border-primary transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              <FiBookOpen />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Applications</div>
              <div className="text-xs font-semibold text-slate-400">Student requests</div>
            </div>
          </div>
          <FiArrowRight className="text-slate-400 group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/admin/hostels/allocations"
          className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:border-primary transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              <FiCheckCircle />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Seat Allocations</div>
              <div className="text-xs font-semibold text-slate-400">{allocations.length} active allocations</div>
            </div>
          </div>
          <FiArrowRight className="text-slate-400 group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/admin/hostels/provosts"
          className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:border-primary transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              <FiUserCheck />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Faculty Provosts</div>
              <div className="text-xs font-semibold text-slate-400">{provosts.length} assigned provosts</div>
            </div>
          </div>
          <FiArrowRight className="text-slate-400 group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* Main Grid: Form + Directory List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Hostel Form */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FiPlus className="text-primary" /> 
            {editId ? 'Modify Hostel Details' : 'Register New Hostel / Hall'}
          </h2>

          <form onSubmit={handleHostelSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Hostel / Hall Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Bangabandhu Hall"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submittingHostel}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Location / Campus Block</label>
              <input
                type="text"
                required
                placeholder="e.g. North Campus, Block B"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submittingHostel}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Designated Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={submittingHostel}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Both">Co-ed / Both</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Rooms Limit</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={totalRoom}
                  onChange={(e) => setTotalRoom(e.target.value)}
                  disabled={submittingHostel}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <TiptapEditor
                value={description}
                onChange={(val) => setDescription(val)}
                placeholder="Write hostel details and rules..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Cover Image</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  disabled={submittingHostel}
                  onChange={handleImageChange}
                  className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-primary hover:file:bg-emerald-50 cursor-pointer w-full"
                />
                {imagePreview && (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 text-[10px] font-bold"
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
                  onClick={clearHostelForm}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submittingHostel}
                className={`py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
                  editId ? 'bg-primary w-1/2' : 'bg-primary w-full'
                } disabled:opacity-50`}
              >
                {submittingHostel ? 'Saving...' : editId ? 'Update Hostel' : 'Register Hostel'}
              </button>
            </div>
          </form>
        </div>

        {/* Hostels List */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Registered Hostels / Halls ({hostels.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">Loading hostels...</div>
          ) : hostels.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No hostels registered yet.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Hostel Name</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Gender</th>
                    <th className="px-6 py-3.5">Rooms Limit</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hostels.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                        {h.image ? (
                          <img src={h.image} alt={h.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-primary flex items-center justify-center font-bold shrink-0">
                            H
                          </div>
                        )}
                        <div>
                          <div>{h.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">/{h.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600 flex items-center gap-1 mt-2.5">
                        <FiMapPin className="text-slate-400" /> {h.location}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                          {h.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{h.total_room || 0} Rooms</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(h)}
                          className="p-2 bg-emerald-50 text-primary hover:bg-emerald-50/80 rounded-xl transition-colors cursor-pointer"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteHostel(h.id, h.name)}
                          className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                        >
                          <FiTrash2 />
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
}

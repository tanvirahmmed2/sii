'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUserCheck, FiPlus, FiTrash2, FiUser } from 'react-icons/fi';

export default function AdminHostelProvostsPage() {
  const [hostels, setHostels] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [provosts, setProvosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resH, resT, resP] = await Promise.all([
        axios.get('/api/hostels'),
        axios.get('/api/teachers'),
        axios.get('/api/hostel-provost')
      ]);

      setHostels(resH.data.payload?.hostels || resH.data.paylod?.hostels || []);
      setTeachers(resT.data.payload?.teachers || resT.data.paylod?.teachers || []);
      setProvosts(resP.data.payload?.provosts || resP.data.paylod?.provosts || []);
    } catch (error) {
      toast.error('Failed to load provost mapping data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProvostSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHostelId || !selectedTeacherId) {
      toast.error('Please select both a Hostel and a Teacher.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/hostel-provost', {
        hostel_id: selectedHostelId,
        teacher_id: selectedTeacherId
      });
      toast.success(response.data.message || 'Provost assigned successfully!');
      setSelectedHostelId('');
      setSelectedTeacherId('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProvost = async (id, teacherName, hostelName) => {
    const confirm = window.confirm(`Remove ${teacherName} as provost of ${hostelName}?`);
    if (!confirm) return;

    try {
      const response = await axios.delete(`/api/hostel-provost/${id}`);
      toast.success(response.data.message || 'Provost assignment removed.');
      setProvosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiUserCheck className="text-primary" /> Faculty Provost Assignments
        </h1>
        <p className="text-sm text-slate-500">
          Assign faculty members and teachers as Provosts to manage residential halls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FiPlus className="text-primary" /> Assign Faculty Provost
          </h2>

          <form onSubmit={handleProvostSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Select Hostel / Hall</label>
              <select
                required
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose Hostel --</option>
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Select Faculty Member</label>
              <select
                required
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose Faculty --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.designation || 'Teacher'})</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer mt-2 disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign as Provost'}
            </button>
          </form>
        </div>

        {/* Provost Assignments List */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">
              Active Provost Assignments ({provosts.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">Loading provosts...</div>
          ) : provosts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No provosts assigned yet.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Hostel Name</th>
                    <th className="px-6 py-3.5">Faculty Provost</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {provosts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{p.hostel_name}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                        <FiUser className="text-slate-400" /> {p.teacher_name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{p.teacher_email}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteProvost(p.id, p.teacher_name, p.hostel_name)}
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

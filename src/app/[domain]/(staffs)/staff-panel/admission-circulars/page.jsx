'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiFileText,
  FiPlus,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiRefreshCw,
  FiX,
  FiLayers,
  FiArrowUpRight
} from 'react-icons/fi';

export default function AdmissionCircularsPage() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircular, setEditingCircular] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    session_name: '2026-2027',
    class_name: 'Class 6',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    min_age: '10',
    max_age: '14',
    total_seats: '120',
    status: 'published',
    fee_amount: '500',
    currency: 'BDT',
    description: '',
  });

  const fetchCirculars = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions`);
      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCirculars(data.circulars || []);
      } else {
        toast.error(data.error || 'Failed to fetch admission circulars.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading circulars.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const openNewModal = () => {
    setEditingCircular(null);
    setForm({
      title: '',
      session_name: '2026-2027',
      class_name: 'Class 6',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      min_age: '10',
      max_age: '14',
      total_seats: '120',
      status: 'published',
      fee_amount: '500',
      currency: 'BDT',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (circ) => {
    setEditingCircular(circ);
    setForm({
      title: circ.title || '',
      session_name: circ.session_name || '',
      class_name: circ.class_name || '',
      start_date: circ.start_date ? circ.start_date.split('T')[0] : '',
      end_date: circ.end_date ? circ.end_date.split('T')[0] : '',
      min_age: circ.min_age !== null ? String(circ.min_age) : '',
      max_age: circ.max_age !== null ? String(circ.max_age) : '',
      total_seats: circ.total_seats !== null ? String(circ.total_seats) : '',
      status: circ.status || 'published',
      fee_amount: circ.fee_amount !== null ? String(circ.fee_amount) : '0',
      currency: circ.fee_currency || 'BDT',
      description: circ.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Circular title is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        id: editingCircular?.id,
        min_age: form.min_age ? parseInt(form.min_age, 10) : null,
        max_age: form.max_age ? parseInt(form.max_age, 10) : null,
        total_seats: form.total_seats ? parseInt(form.total_seats, 10) : null,
        fee_amount: form.fee_amount ? parseFloat(form.fee_amount) : 0,
      };

      const method = editingCircular ? 'PUT' : 'POST';
      const res = await fetch(`${apiBase}/staff/panel/admissions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editingCircular ? 'Circular updated successfully!' : 'Circular created successfully!');
        setIsModalOpen(false);
        fetchCirculars();
      } else {
        toast.error(data.error || 'Failed to save admission circular.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Circular deleted successfully.');
        fetchCirculars();
      } else {
        toast.error(data.error || 'Failed to delete circular.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting circular.');
    }
  };

  const filteredCirculars = useMemo(() => {
    return circulars.filter((c) => {
      const matchSearch =
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.session_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [circulars, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = circulars.length;
    const active = circulars.filter((c) => c.status === 'published').length;
    const totalApplicants = circulars.reduce((acc, c) => acc + parseInt(c.applicant_count || 0, 10), 0);
    const totalSeats = circulars.reduce((acc, c) => acc + parseInt(c.total_seats || 0, 10), 0);
    return { total, active, totalApplicants, totalSeats };
  }, [circulars]);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiLayers className="text-sky-600 dark:text-sky-400" />
            Admission Circulars & Fee Schedules
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publish academic intake circulars, configure application fees, and supervise candidate capacity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCirculars}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh List"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded shadow-sm transition"
          >
            <FiPlus className="w-4 h-4" />
            Create Admission Circular
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active Circulars</span>
            <FiCheckCircle className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.active}</span>
            <span className="text-xs text-slate-500">of {stats.total} total</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Seat Capacity</span>
            <FiUsers className="text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalSeats}</span>
            <span className="text-xs text-sky-600 dark:text-sky-400">Intake quota</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Submissions</span>
            <FiFileText className="text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalApplicants}</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">Registered applicants</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Payment Status</span>
            <FiDollarSign className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">Gateway Ready</span>
            <span className="text-xs text-emerald-600">Assigned</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search by title, session, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <Link
            href="/staff-panel/admission-applicants"
            className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded flex items-center gap-1 transition"
          >
            Review Applicants <FiArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Circulars List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Circular & Class</th>
                <th className="py-3 px-4">Application Window</th>
                <th className="py-3 px-4">Seats & Age Limit</th>
                <th className="py-3 px-4">Admission Fee</th>
                <th className="py-3 px-4">Applicants</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                    Loading admission circulars...
                  </td>
                </tr>
              ) : filteredCirculars.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No admission circulars found. Click &quot;Create Admission Circular&quot; to publish your first intake schedule.
                  </td>
                </tr>
              ) : (
                filteredCirculars.map((circ) => (
                  <tr key={circ.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{circ.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium text-slate-600 dark:text-slate-400">
                          {circ.class_name || 'All Classes'}
                        </span>
                        <span>Session: {circ.session_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div>{circ.start_date ? new Date(circ.start_date).toLocaleDateString() : 'N/A'}</div>
                      <div className="text-slate-400 text-[10px]">to {circ.end_date ? new Date(circ.end_date).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div><strong className="text-slate-900 dark:text-white">{circ.total_seats || 'Unlimited'}</strong> Seats</div>
                      <div className="text-[10px] text-slate-400">
                        Age: {circ.min_age ?? '0'} - {circ.max_age ?? '∞'} yrs
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {circ.fee_amount ? parseFloat(circ.fee_amount).toFixed(2) : '0.00'}
                      </span>{' '}
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded">
                        {circ.fee_currency || 'BDT'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/staff-panel/admission-applicants?circular_id=${circ.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700 underline"
                      >
                        {circ.applicant_count || 0} candidates
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          circ.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : circ.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {circ.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/staff-panel/admission-circular-update?id=${circ.id}`}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Update Circular"
                        >
                          <FiEdit3 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(circ.id, circ.title)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Delete Circular"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Circular Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FiFileText className="text-sky-600" />
                {editingCircular ? 'Edit Admission Circular' : 'Create Admission Circular'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Circular Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Academic Intake 2026-2027"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Academic Class
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class 6, Grade 9, Higher Secondary"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-2027"
                    value={form.session_name}
                    onChange={(e) => setForm({ ...form, session_name: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Application Start Date
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Min Age (Yrs)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={form.min_age}
                    onChange={(e) => setForm({ ...form, min_age: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Max Age (Yrs)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={form.max_age}
                    onChange={(e) => setForm({ ...form, max_age: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={form.total_seats}
                    onChange={(e) => setForm({ ...form, total_seats: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Admission Fee Schedule
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Fee Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 500"
                      value={form.fee_amount}
                      onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="BDT">BDT (৳ Bangladeshi Taka)</option>
                      <option value="USD">USD ($ US Dollar)</option>
                      <option value="EUR">EUR (€ Euro)</option>
                      <option value="GBP">GBP (£ British Pound)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Publication Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="published">Published (Active for online application)</option>
                  <option value="draft">Draft (Hidden from public)</option>
                  <option value="archived">Archived (Intake closed)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCircular ? 'Update Circular' : 'Create Circular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

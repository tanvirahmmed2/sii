'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiUsers, FiCheck, FiX, FiLayers, FiCalendar, FiClock, FiSearch, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link';

const AdmissionsPage = () => {
  const [admissions, setAdmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students/admissions');
      const data = await res.json();
      if (data.success && data.paylod?.admissions) {
        setAdmissions(data.paylod.admissions);
      }
    } catch (err) {
      toast.error('Failed to load admission applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const handleProcessAdmission = async (id, status) => {
    const confirm = window.confirm(`Are you sure you want to change status to "${status}"?`);
    if (!confirm) return;

    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/students/admissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || `Application status updated to ${status}!`);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        fetchAdmissions();
      } else {
        throw new Error(data.error || 'Failed to process application.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAction = async (status) => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one applicant.');
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to mark ${selectedIds.length} selected applicant(s) as "${status}"?`
    );
    if (!confirm) return;

    setBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/students/admissions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || `Selected applicants marked as ${status}!`);
        setSelectedIds([]);
        fetchAdmissions();
      } else {
        throw new Error(data.error || `Failed to bulk update applicants.`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const isSelectedStatus = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'selected' || s === 'approved';
  };

  const isDisqualifiedStatus = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'disqualified' || s === 'rejected';
  };

  const pendingAdmissions = admissions.filter((a) => {
    const s = (a.status || '').toLowerCase();
    return s === 'pending' || s === 'incomplete';
  });

  const processedAdmissions = admissions.filter((a) => {
    const s = (a.status || '').toLowerCase();
    return isSelectedStatus(s) || isDisqualifiedStatus(s);
  });

  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (a) =>
        (a.applicant_name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q) ||
        String(a.id || '').includes(q)
    );
  };

  const currentTabAdmissions = filterBySearch(
    activeTab === 'pending' ? pendingAdmissions : processedAdmissions
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentTabAdmissions.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiUsers className="text-primary" /> Student Admission Applications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review candidate details, multi-select, and set selection/disqualification statuses.
          </p>
        </div>

        <Link
          href="/admin/students/admissions/circulars"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs self-start sm:self-auto"
        >
          <FiLayers className="text-sm" />
          <span>Manage Circulars</span>
        </Link>
      </div>

      {/* Toolbar Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 rounded-2xl shadow-2xs">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('pending');
              setSelectedIds([]);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pending Applications ({pendingAdmissions.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('archive');
              setSelectedIds([]);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'archive'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Processed Archive ({processedAdmissions.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Search candidate name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary"
          />
        </div>

        {/* Multi-Select Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-xl shadow-xs text-xs font-semibold">
            <span>{selectedIds.length} Selected</span>
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkAction('selected')}
              className="px-2.5 py-1 bg-primary hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer text-[10px] font-bold inline-flex items-center gap-1"
            >
              <FiCheck /> Select
            </button>
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkAction('disqualified')}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer text-[10px] font-bold inline-flex items-center gap-1"
            >
              <FiX /> Disqualify
            </button>
          </div>
        )}
      </div>

      {/* Main Registry Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading admissions...</span>
          </div>
        ) : currentTabAdmissions.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-3xl mb-2">📝</span>
            <h3 className="text-xs font-bold text-slate-700">No Applications Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              {activeTab === 'pending'
                ? 'Intake pending list is currently empty.'
                : 'No processed or archived candidate applications logged.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        currentTabAdmissions.length > 0 &&
                        selectedIds.length === currentTabAdmissions.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Applicant / ID</th>
                  <th className="px-4 py-3">Contact Detail</th>
                  <th className="px-4 py-3">Class &amp; Circular</th>
                  <th className="px-4 py-3">Fee Status</th>
                  <th className="px-4 py-3">Selection Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentTabAdmissions.map((adm) => {
                  const isChecked = selectedIds.includes(adm.id);
                  const isSel = isSelectedStatus(adm.status);
                  const isDis = isDisqualifiedStatus(adm.status);

                  return (
                    <tr
                      key={adm.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isChecked ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectOne(adm.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-slate-800">{adm.applicant_name}</p>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-mono font-bold">
                            APP-1000{adm.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-700">{adm.phone}</p>
                        <p className="text-[10px] text-slate-400">{adm.email}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded">
                          Class: {adm.class_name}
                        </span>
                        {adm.admission_title && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={adm.admission_title}>
                            {adm.admission_title}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-bold text-slate-800">BDT {parseFloat(adm.fee_amount || adm.admission_fees_amount || 0).toFixed(2)}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 border ${
                          adm.fee_status === 'paid' || adm.fee_status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {adm.fee_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isSel
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : isDis
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isSel ? 'Selected' : isDis ? 'Disqualified' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                        <Link
                          href={`/admin/students/admissions/applicant?id=${adm.id}`}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Preview Applicant Info"
                        >
                          <FiSearch className="text-xs" />
                        </Link>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleProcessAdmission(adm.id, 'selected')}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Select Candidate"
                        >
                          <FiCheck className="text-xs" />
                        </button>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleProcessAdmission(adm.id, 'disqualified')}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Disqualify Candidate"
                        >
                          <FiX className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionsPage;

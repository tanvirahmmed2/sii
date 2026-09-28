'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiUsers, FiCheck, FiX, FiLayers, FiCalendar, FiClock, FiSearch } from 'react-icons/fi';
import Link from 'next/link';

const RegistrarAdmissionsPage = () => {
  const [admissions, setAdmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

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
    const confirm = window.confirm(`Are you sure you want to mark this candidate as "${status}"?`);
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

  const currentTabAdmissions = activeTab === 'pending' ? pendingAdmissions : processedAdmissions;

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 uppercase tracking-wider inline-block mb-1">
          Registrar Desk
        </span>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiUsers className="text-emerald-600" /> Candidate Admission Review
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review, verify candidate applications, and set selection statuses.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white text-emerald-700 border-t border-x border-slate-200/80 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending Applications ({pendingAdmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'archive'
              ? 'bg-white text-emerald-700 border-t border-x border-slate-200/80 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Processed Archive ({processedAdmissions.length})
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading admissions...</span>
          </div>
        ) : currentTabAdmissions.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-3xl mb-2">📝</span>
            <h3 className="text-xs font-bold text-slate-700">No Applications Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              {activeTab === 'pending' ? 'Pending intake review list is currently empty.' : 'No archived applicant records.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                  const isSel = isSelectedStatus(adm.status);
                  const isDis = isDisqualifiedStatus(adm.status);

                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-bold text-slate-800">{adm.applicant_name}</p>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-mono font-bold">
                          APP-1000{adm.id}
                        </span>
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

export default RegistrarAdmissionsPage;

'use client';

import React, { useState, useEffect } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiHome, FiCheckCircle, FiClock, FiXCircle, 
  FiSend, FiShield, FiUser, FiInfo 
} from 'react-icons/fi';

export default function StudentHostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeAllocation, setActiveAllocation] = useState(null);
  const [isAllocated, setIsAllocated] = useState(false);
  const [studentGender, setStudentGender] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application form
  const [preferredHostelId, setPreferredHostelId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/student/residence');
      const data = res.data?.payload || res.data?.paylod || res.data || {};

      setHostels(data.hostels || []);
      setApplications(data.applications || []);
      setActiveAllocation(data.activeAllocation || null);
      setIsAllocated(Boolean(data.isAllocated));
      setStudentGender(data.studentGender || null);
    } catch (error) {
      toast.error('Failed to load hostel data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (isAllocated) {
      toast.error('You are already allocated to a hostel seat.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/student/residence', {
        preferred_hostel_id: preferredHostelId || null,
        reason
      });

      toast.success(response.data.message || 'Hostel application submitted!');
      setPreferredHostelId('');
      setReason('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingApp = applications.some(a => a.status === 'pending');

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiHome /> Residential Accommodation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Hostel &amp; Hall Accommodation</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            View active hostel room allocations, room details, explore available halls, or submit applications for new hall seat assignments.
          </p>
        </div>
      </div>

      {loading ? (
        <TenantLoader fullScreen={false} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Active Allocation or Application Form */}
            <div className="lg:col-span-1 bg-white border border-slate-200/70 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
              {isAllocated && activeAllocation ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-base border-b border-slate-100 pb-3">
                    <FiCheckCircle className="text-lg text-emerald-600" /> Active Seat Allocated
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 text-emerald-950 flex flex-col gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Hostel Hall</div>
                      <div className="text-base font-bold text-slate-900">{activeAllocation.hostel_name}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-200/60">
                      <div>
                        <span className="font-semibold text-slate-500 text-[11px]">Seat Code:</span>
                        <div className="font-bold text-emerald-700 text-sm font-mono">{activeAllocation.seat_code || activeAllocation.seat_number}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 text-[11px]">Location:</span>
                        <div className="font-semibold text-slate-800">Floor {activeAllocation.floor_number || 1}, Room {activeAllocation.room_number}</div>
                      </div>
                    </div>

                    <div className="text-xs text-emerald-800 pt-2 border-t border-emerald-200/60 font-semibold">
                      Monthly Fee: ৳{activeAllocation.monthly_fee || 0}/month
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2">
                    <FiShield className="text-amber-600 text-base shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      You currently hold an active seat allocation. New seat applications are restricted while holding an active seat.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FiSend className="text-emerald-600" /> Apply for Hostel Allocation
                  </h2>

                  {hasPendingApp ? (
                    <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 flex flex-col gap-2">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <FiClock className="text-sm" /> Application Under Review
                      </p>
                      <p className="text-xs leading-relaxed">
                        Your hostel application has been submitted and is currently being reviewed by hall administration. You will be notified once processed.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleApplySubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">Preferred Hall (Optional)</label>
                          {studentGender && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              {studentGender} Halls Only
                            </span>
                          )}
                        </div>
                        <select
                          value={preferredHostelId}
                          onChange={(e) => setPreferredHostelId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- No Preference (Any Eligible Hall) --</option>
                          {hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name} ({h.type || 'Hall'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700">Reason for Request *</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="State your reason for accommodation request (e.g. distance from home, scholarship)..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Application History Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200/70 rounded-3xl shadow-xs p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-800">
                  Hostel Application History ({applications.length})
                </h2>
                <span className="text-xs text-slate-400 font-medium">Record of accommodation requests</span>
              </div>

              {applications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                  No previous hostel applications submitted.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-2.5 px-3 rounded-l-xl">Requested Hall</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3">Applied Date</th>
                        <th className="py-2.5 px-3 text-right rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {app.preferred_hostel_name || 'General Hall Assignment'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                            {app.reason || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(app.applied_date || app.created_at || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {app.status === 'pending' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 inline-flex items-center gap-1">
                                <FiClock /> Pending
                              </span>
                            )}
                            {(app.status === 'approved' || app.status === 'allocated') && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1">
                                <FiCheckCircle /> Allocated
                              </span>
                            )}
                            {app.status === 'rejected' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 inline-flex items-center gap-1">
                                <FiXCircle /> Rejected
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Available Halls Directory Table */}
          {hostels.length > 0 && (
            <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Campus Residential Halls Directory</h2>
                  <p className="text-xs text-slate-400 font-medium">Overview of available institutional dormitories and fee rates</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Total Halls: {hostels.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4 rounded-l-xl">Hall Name</th>
                      <th className="py-3 px-4">Hall Type</th>
                      <th className="py-3 px-4">Warden / In-Charge</th>
                      <th className="py-3 px-4 text-center">Total Rooms</th>
                      <th className="py-3 px-4 text-center">Available Seats</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Monthly Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {hostels.map((hostel) => (
                      <tr key={hostel.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {hostel.name}
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {hostel.type || 'co-ed'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {hostel.warden_name ? (
                            <div>
                              <p className="font-semibold text-slate-800">{hostel.warden_name}</p>
                              {hostel.warden_phone && <p className="text-[10px] text-slate-400">{hostel.warden_phone}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Hall Administration</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {hostel.total_rooms || hostel.capacity ? Math.ceil((hostel.capacity || 100) / 4) : 25}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                          {hostel.available_seats || hostel.capacity || 10}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800 font-mono">
                          ৳{parseFloat(hostel.monthly_fee || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

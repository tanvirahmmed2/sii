'use client';

import React, { useState, useEffect } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StudentHostelsPage() {
  const { getApiEndpoint } = useTenantWebsite();

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('student/residence'));
      if (res.ok) {
        const data = await res.json();
        const payload = data.payload || data.paylod || data || {};
        setHostels(payload.hostels || []);
        setApplications(payload.applications || []);
        setActiveAllocation(payload.activeAllocation || null);
        setIsAllocated(Boolean(payload.isAllocated));
        setStudentGender(payload.studentGender || null);
      }
    } catch {
      toast.error('Failed to load hostel data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getApiEndpoint]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (isAllocated) {
      toast.error('You are already allocated to a hostel seat.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiEndpoint('student/residence'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_hostel_id: preferredHostelId || null,
          reason
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message || 'Hostel application submitted!');
        setPreferredHostelId('');
        setReason('');
        fetchData();
      } else {
        toast.error(resData.error || 'Failed to submit application.');
      }
    } catch (err) {
      toast.error(err.message || 'Network error submitting application.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingApp = applications.some(a => a.status === 'pending');

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Residential Accommodation
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Hostel &amp; Hall Accommodation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View active hostel room allocations, room details, explore available halls, or submit seat assignment requests.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Active Allocation or Application Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          {isAllocated && activeAllocation ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  Active Seat Allocation
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  Allocated
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-md p-3 space-y-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hostel Hall</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{activeAllocation.hostel_name}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Seat Code:</span>
                    <span className="font-semibold text-primary font-mono">{activeAllocation.seat_code || activeAllocation.seat_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Location:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Floor {activeAllocation.floor_number || 1}, Room {activeAllocation.room_number}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700 font-medium">
                  Monthly Fee: <strong className="font-mono text-slate-900 dark:text-white font-semibold">৳{activeAllocation.monthly_fee || 0}</strong>/month
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You currently hold an active seat assignment. New seat applications are restricted while holding an active seat.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                Apply for Hostel Allocation
              </h2>

              {hasPendingApp ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-semibold">Application Under Review</p>
                  <p className="text-[11px] leading-relaxed">
                    Your hostel application has been submitted and is currently being reviewed by hall administration. You will be notified once processed.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Preferred Hall</label>
                      {studentGender && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                          {studentGender} Halls
                        </span>
                      )}
                    </div>
                    <select
                      value={preferredHostelId}
                      onChange={(e) => setPreferredHostelId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-primary cursor-pointer"
                    >
                      <option value="">-- Any Eligible Hall --</option>
                      {hostels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.type || 'Hall'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Reason for Request *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="State your reason for accommodation request (e.g. distance from home, scholarship)..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Application History Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Hostel Application History ({applications.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Record of accommodation requests</span>
          </div>

          {applications.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-medium">
              No previous hostel applications submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Requested Hall</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Applied Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {app.preferred_hostel_name || 'General Hall Assignment'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {app.reason || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono">
                        {new Date(app.applied_date || app.created_at || Date.now()).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {app.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                        {(app.status === 'approved' || app.status === 'allocated') && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-wider">
                            Allocated
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 uppercase tracking-wider">
                            Rejected
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
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Campus Residential Halls Directory</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Overview of institutional dormitories and rates</p>
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Total Halls: {hostels.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Hall Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Warden In-Charge</th>
                  <th className="py-2.5 px-3 text-center">Total Rooms</th>
                  <th className="py-2.5 px-3 text-center">Available Seats</th>
                  <th className="py-2.5 px-3 text-right">Monthly Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {hostels.map((hostel) => (
                  <tr key={hostel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {hostel.name}
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {hostel.type || 'co-ed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {hostel.warden_name ? (
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{hostel.warden_name}</p>
                          {hostel.warden_phone && <p className="text-[10px] text-slate-400 font-mono">{hostel.warden_phone}</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Hall Administration</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                      {hostel.total_rooms || 25}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-primary">
                      {hostel.available_seats || 10}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white font-mono">
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
  );
}

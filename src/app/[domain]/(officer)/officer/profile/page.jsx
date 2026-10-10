'use client';

import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function OfficerProfilePage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password update states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiEndpoint('officer/me'));
      if (res.ok) {
        const data = await res.json();
        const o = data.officer || data.payload?.officer;
        setOfficer(o);
        if (o) {
          setPhone(o.phone || '');
          setAddress(o.address || '');
          setBio(o.bio || '');
        }
      }
    } catch (err) {
      console.error('Error loading officer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [getApiEndpoint]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Update officer personal details
      const endpoint = getApiEndpoint('staff/panel/officers');
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: officer?.id,
          phone: phone.trim(),
          address: address.trim(),
          bio: bio.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      toast.success('Officer profile updated successfully.');
      fetchProfile();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
          Officer Profile & Security Workstation
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View official institutional credentials, update contact information, and manage security settings.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading profile data...</div>
      ) : !officer ? (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs">
          Unable to load officer profile records.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Official Identity Overview */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Campus Identity
                </span>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  {officer.name}
                </h2>
                <p className="text-[11px] font-mono text-slate-500">{officer.email}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {officer.designation || 'Officer'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Department</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {officer.department || 'General'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Account Status</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Verified & Active
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Joining Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {officer.joiningDate ? new Date(officer.joiningDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">National ID</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {officer.nidNumber || 'Not recorded'}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Blood Group</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {officer.bloodGroup || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Update Contact & Bio */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Contact & Residential Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Keep your reachable phone number and address up to date.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1700 000000"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Official / Campus Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Administration Building, Room 204"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Officer Biographical Note
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short summary of administrative duties and campus office hours..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving Details...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            </div>

            {/* Granted Modules Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Authorized Package Modules Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The modules below are assigned to your officer account by campus staff:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {Object.keys(officer.permissions || {}).length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No modules granted</span>
                ) : (
                  Object.keys(officer.permissions || {}).map((slug) => {
                    const p = officer.permissions[slug];
                    return (
                      <div
                        key={slug}
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/40 text-xs"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.module_name || slug}
                        </div>
                        <div className="text-[10px] text-slate-500 space-x-1.5 pt-0.5">
                          {p.can_view && <span>View</span>}
                          {p.can_create && <span>• Create</span>}
                          {p.can_edit && <span>• Edit</span>}
                          {p.can_delete && <span>• Delete</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

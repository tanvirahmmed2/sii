'use client';

import { useState, useEffect, useContext, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingScreen from 'src/component/common/LoadingScreen';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

export default function CreatorDetailsPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const creatorId = routeParams?.id || (params ? (typeof params.then === 'function' ? use(params)?.id : params.id) : null);

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1 || String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' || permissions.includes('*');
  const isAuthorized = isOwner || permissions.includes('creators') || permissions.includes('creator');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(null);

  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    address: '',
    is_active: true,
    is_verified: false,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');

  const fetchCreatorDetails = async (isRefresh = false) => {
    if (!creatorId) return;
    try {
      if (isRefresh) setLoading(true);
      setError(null);
      const res = await fetch(`/api/marketing/developer/creators/${creatorId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.creator) {
          setEditForm({
            name: json.creator.name || '',
            email: json.creator.email || '',
            phone: json.creator.phone || '',
            country: json.creator.country || '',
            city: json.creator.city || '',
            address: json.creator.address || '',
            is_active: Boolean(json.creator.is_active),
            is_verified: Boolean(json.creator.is_verified),
          });
        }
      } else {
        setError(json.error || 'Creator not found');
      }
    } catch (err) {
      console.error('Failed to load creator:', err);
      setError('An error occurred while loading creator details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!isAuthorized || !creatorId) {
      return;
    }

    fetch(`/api/marketing/developer/creators/${creatorId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success) {
            setData(json);
            if (json.creator) {
              setEditForm({
                name: json.creator.name || '',
                email: json.creator.email || '',
                phone: json.creator.phone || '',
                country: json.creator.country || '',
                city: json.creator.city || '',
                address: json.creator.address || '',
                is_active: Boolean(json.creator.is_active),
                is_verified: Boolean(json.creator.is_verified),
              });
            }
          } else {
            setError(json.error || 'Creator not found');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load creator:', err);
          setError('An error occurred while loading creator details');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isAuthorized, creatorId]);

  const handleToggleActive = async () => {
    if (!creatorId || !data?.creator) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/marketing/developer/creators/${creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toggle_active: true }),
      });
      const json = await res.json();
      if (json.success) {
        setData((prev) => ({
          ...prev,
          creator: {
            ...prev.creator,
            is_active: json.creator.is_active,
          },
        }));
      } else {
        alert(json.error || 'Failed to toggle status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating creator status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErr('');
    setPasswordMsg('');

    if (newPassword.length < 6) {
      setPasswordErr('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErr('New password and confirm password do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await fetch(`/api/marketing/developer/creators/${creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'change_password',
          newPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPasswordMsg('Creator password changed successfully.');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordPanel(false);
          setPasswordMsg('');
        }, 2000);
      } else {
        setPasswordErr(json.error || json.message || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordErr('Network error while changing creator password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditErr('');
    setEditMsg('');

    try {
      setEditLoading(true);
      const res = await fetch(`/api/marketing/developer/creators/${creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });

      const json = await res.json();
      if (json.success) {
        setEditMsg('Creator details updated successfully.');
        setData((prev) => ({
          ...prev,
          creator: {
            ...prev.creator,
            ...json.creator,
          },
        }));
        setTimeout(() => {
          setShowEditPanel(false);
          setEditMsg('');
        }, 1500);
      } else {
        setEditErr(json.error || json.message || 'Failed to update creator details.');
      }
    } catch (err) {
      setEditErr('Network error while updating creator details.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!isAuthorized && user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded p-8 text-center shadow-sm">
          <h2 className="text-xl font-medium text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Inspecting creator details requires the <span className="font-normal text-slate-800 font-mono">creators</span> permission.
          </p>
          <Link
            href="/developer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-normal transition-colors shadow-sm"
          >
            Return to Developer Overview
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen fullScreen={false} label="Loading creator profile..." />;
  }

  if (error || !data?.creator) {
    return (
      <div className="space-y-6">
        <Link
          href="/developer/creators"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>Back to Creators Directory</span>
        </Link>

        <div className="bg-white border border-rose-200 rounded p-12 text-center shadow-xs">
          <h2 className="text-xl font-medium text-slate-900 mb-2">Creator Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            {error || `Unable to locate creator account with ID #${creatorId}. The record might have been deleted.`}
          </p>
          <Link
            href="/developer/creators"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-normal transition-colors"
          >
            Return to Creators Directory
          </Link>
        </div>
      </div>
    );
  }

  const {
    creator,
    activeSubscription,
    subscriptions = [],
    purchases = [],
    websites = [],
    payments = [],
    tickets = [],
    supports = [],
    stats = {},
    canEdit = false,
  } = data;

  const displayTickets = tickets.length > 0 ? tickets : supports;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/developer/creators"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white px-3.5 py-2 rounded border border-slate-200 shadow-xs"
        >
          <span>Back to Creators Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchCreatorDetails(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-normal transition-colors shadow-xs cursor-pointer"
          >
            <span>Refresh</span>
          </button>
          <Link
            href={`/creator/${creator.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
          >
            <span>Open Creator Panel</span>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
                {creator.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-normal border border-slate-200">
                ID: #{creator.id}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-medium uppercase border ${creator.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
              >
                {creator.is_active ? 'Active' : 'Suspended'}
              </span>

              {creator.is_verified && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-medium uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  Verified
                </span>
              )}

              {creator.two_factor_enabled && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-medium uppercase bg-purple-50 text-purple-700 border border-purple-200">
                  2FA Active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono font-medium text-slate-800">{creator.email}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(creator.email, 'email')}
                  className="text-slate-400 hover:text-slate-700 px-1 py-0.5 text-[11px] underline cursor-pointer"
                >
                  {copiedText === 'email' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono font-medium text-slate-800">{creator.phone || 'Not provided'}</span>
                {creator.phone && (
                  <button
                    type="button"
                    onClick={() => handleCopy(creator.phone, 'phone')}
                    className="text-slate-400 hover:text-slate-700 px-1 py-0.5 text-[11px] underline cursor-pointer"
                  >
                    {copiedText === 'phone' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <span>
                  Member since{' '}
                  {creator.created_at
                    ? new Date(creator.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasswordPanel(true)}
              className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Change Password
            </button>

            <button
              type="button"
              onClick={() => setShowEditPanel(true)}
              className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Edit Details
            </button>

            <button
              type="button"
              onClick={handleToggleActive}
              disabled={actionLoading}
              className={`px-4 py-2 rounded text-xs font-medium transition-all cursor-pointer ${creator.is_active
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-50`}
            >
              {actionLoading ? 'Updating...' : creator.is_active ? 'Suspend Account' : 'Activate Account'}
            </button>
          </div>
        </div>
      </div>

      {showPasswordPanel && (
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Change Creator Password</h2>
            <button
              type="button"
              onClick={() => {
                setShowPasswordPanel(false);
                setPasswordErr('');
                setPasswordMsg('');
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          {passwordMsg && (
            <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {passwordMsg}
            </div>
          )}
          {passwordErr && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {passwordErr}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-mono"
                >
                  {showPasswordText ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <input
                type={showPasswordText ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPasswordPanel(false)}
                className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditPanel && (
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Creator Information</h2>
            <button
              type="button"
              onClick={() => {
                setShowEditPanel(false);
                setEditErr('');
                setEditMsg('');
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          {editMsg && (
            <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {editMsg}
            </div>
          )}
          {editErr && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {editErr}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <textarea
                rows={2}
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300">Account Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_verified}
                  onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300">Email Verified</span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditPanel(false)}
                className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-normal">Active Package</div>
          <div className="text-lg font-medium text-slate-900 mt-2 truncate">
            {activeSubscription?.package_name || 'No Active Plan'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {activeSubscription
              ? `$${((activeSubscription.price_in_cents || 0) / 100).toFixed(2)} / ${activeSubscription.billing_interval || 'mo'}`
              : 'Free or inactive'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-normal">Plan Status</div>
          <div className="text-lg font-medium text-slate-900 mt-2 uppercase">
            {activeSubscription?.status || 'INACTIVE'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.daysRemaining > 0 ? `${stats.daysRemaining} day(s) remaining` : 'Expired or not set'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-normal">Websites</div>
          <div className="text-lg font-medium text-slate-900 mt-2">
            {stats.totalWebsites || 0}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {stats.maxWebsites ? `${stats.maxWebsites} max` : 'Unlimited'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            {websites.filter((w) => w.is_published).length} Published site(s)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-normal">Storage Used</div>
          <div className="text-lg font-medium text-slate-900 mt-2">
            {stats.totalStorageMb || 0} MB
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assets & site storage</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-slate-500 text-xs font-normal">Total Spend</div>
          <div className="text-lg font-medium text-slate-900 mt-2">
            {Number(stats.totalSpentUsd || 0) > 0 && Number(stats.totalSpentBdt || 0) > 0 ? (
              <span>${Number(stats.totalSpentUsd || 0).toFixed(2)} USD + ৳{Number(stats.totalSpentBdt || 0).toLocaleString()} BDT</span>
            ) : Number(stats.totalSpentBdt || 0) > 0 ? (
              <span>৳{Number(stats.totalSpentBdt || 0).toLocaleString()} BDT</span>
            ) : (
              <span>${Number(stats.totalSpentUsd || 0).toFixed(2)} USD</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.totalPayments || payments.length} payment transaction(s)
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded p-1.5 shadow-xs flex flex-wrap items-center gap-1 text-xs font-normal">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs font-medium'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Account Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? 'bg-slate-900 text-white shadow-xs font-medium'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Purchases ({purchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-slate-900 text-white shadow-xs font-medium'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-slate-900 text-white shadow-xs font-medium'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Payments ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={`px-4 py-2 rounded transition-all cursor-pointer ${
            activeTab === 'support'
              ? 'bg-slate-900 text-white shadow-xs font-medium'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Supports ({displayTickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('websites')}
          className={`px-4 py-2 rounded transition-all cursor-pointer ${
            activeTab === 'websites'
              ? 'bg-slate-900 text-white shadow-xs font-medium'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Websites ({websites.length})</span>
        </button>
      </div>

{
  activeTab === 'overview' && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-medium text-slate-900 border-b border-slate-100 pb-3">
          Identity &amp; Contact Details
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Account ID:</span>
            <span className="font-mono font-medium text-slate-800">#{creator.id}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Full Name:</span>
            <span className="font-normal text-slate-800">{creator.name}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Email Address:</span>
            <div className="flex items-center gap-1.5 font-mono text-slate-800">
              <span>{creator.email}</span>
              <button
                type="button"
                onClick={() => handleCopy(creator.email, 'email')}
                className="text-slate-400 hover:text-slate-700 underline text-[10px] cursor-pointer"
              >
                {copiedText === 'email' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Phone Number:</span>
            <div className="flex items-center gap-1.5 font-mono text-slate-800">
              <span>{creator.phone || 'Not provided'}</span>
              {creator.phone && (
                <button
                  type="button"
                  onClick={() => handleCopy(creator.phone, 'phone')}
                  className="text-slate-400 hover:text-slate-700 underline text-[10px] cursor-pointer"
                >
                  {copiedText === 'phone' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Country:</span>
            <span className="text-slate-800">{creator.country || 'Not specified'}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">City:</span>
            <span className="text-slate-800">{creator.city || 'Not specified'}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Address:</span>
            <span className="text-slate-800 text-right max-w-xs truncate">{creator.address || 'Not specified'}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Registered Date:</span>
            <span className="font-mono text-slate-700">
              {creator.created_at ? new Date(creator.created_at).toLocaleString() : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500">Last Profile Update:</span>
            <span className="font-mono text-slate-700">
              {creator.updated_at ? new Date(creator.updated_at).toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-medium text-slate-900 border-b border-slate-100 pb-3">
          Security &amp; Access Status
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Account Status:</span>
            <span
              className={`px-2 py-0.5 rounded font-medium uppercase text-[10px] ${creator.is_active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
            >
              {creator.is_active ? 'Active Access' : 'Access Suspended'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Email Verification:</span>
            <span
              className={`px-2 py-0.5 rounded font-medium uppercase text-[10px] ${creator.is_verified
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
            >
              {creator.is_verified ? 'Verified Email' : 'Unverified'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Two-Factor Authentication:</span>
            <span
              className={`px-2 py-0.5 rounded font-medium uppercase text-[10px] ${creator.two_factor_enabled
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
            >
              {creator.two_factor_enabled ? '2FA Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Last Login Timestamp:</span>
            <span className="font-mono text-slate-700">
              {creator.last_login_at ? new Date(creator.last_login_at).toLocaleString() : 'Never logged in'}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Direct Actions:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordPanel(true)}
                className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => setShowEditPanel(true)}
                className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium cursor-pointer"
              >
                Edit Info
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

{
  activeTab === 'purchases' && (
    <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 text-sm">Purchase Orders</h3>
          <p className="text-xs text-slate-500">Order invoices and package purchase transactions.</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {purchases.length} purchase(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Purchase ID</th>
              <th className="py-3 px-4">Order Code</th>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Total Amount</th>
              <th className="py-3 px-4">Billing Cycle</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Coverage Period</th>
              <th className="py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No purchase order records found for this creator.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    #{p.id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {p.purchase_code || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{p.package_name || 'Custom Plan'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                    ${Number(p.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-600">
                    {p.billing_cycle || 'monthly'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${p.status === 'completed' || p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {p.period_start ? new Date(p.period_start).toLocaleDateString() : '—'}
                    {' → '}
                    {p.period_end ? new Date(p.period_end).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{
  activeTab === 'subscriptions' && (
    <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 text-sm">Subscription Records</h3>
          <p className="text-xs text-slate-500">Package subscription intervals and lifecycle status.</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {subscriptions.length} subscription(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Sub ID</th>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Billing Period</th>
              <th className="py-3 px-4">Price / Interval</th>
              <th className="py-3 px-4">Auto Renew</th>
              <th className="py-3 px-4">Activated Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No subscription records found for this creator.
                </td>
              </tr>
            ) : (
              subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    #{s.id}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{s.package_name || 'Standard Package'}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${s.status === 'active' || s.status === 'ACTIVE' || s.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                      {s.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                    {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString() : '—'}
                    {' → '}
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-normal text-slate-800">
                    ${((s.price_in_cents || 0) / 100).toFixed(2)} / {s.billing_interval || s.billing_cycle || 'mo'}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${!s.cancel_at_period_end
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                    >
                      {!s.cancel_at_period_end ? 'Active Renew' : 'Canceling'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{
  activeTab === 'payments' && (
    <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 text-sm">Payment Transactions</h3>
          <p className="text-xs text-slate-500">History of payments processed for this creator account.</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {payments.length} payment(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Method</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Transaction Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No payment transactions recorded for this creator.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    {p.transaction_id || `#${p.id}`}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-normal text-slate-800">
                      {p.package_name || (p.purchase_code ? `Order ${p.purchase_code}` : `Purchase #${p.purchase_id || p.id}`)}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                    ${((p.amount_in_cents || (p.amount ? p.amount * 100 : 0)) / 100).toFixed(2)}{' '}
                    <span className="text-[10px] text-slate-400">{p.currency || 'USD'}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {p.payment_method || 'CARD'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${p.status === 'completed' || p.status === 'COMPLETED' || p.status === 'successful'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {p.payment_date || p.created_at ? new Date(p.payment_date || p.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{
  activeTab === 'support' && (
    <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 text-sm">Creator Support Inquiries</h3>
          <p className="text-xs text-slate-500">Tickets and support inquiries submitted by this creator.</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {displayTickets.length} ticket(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Ticket ID</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Submitted Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No support tickets submitted by this creator.
                </td>
              </tr>
            ) : (
              displayTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    {t.ticket_number || `#${t.id}`}
                  </td>

                  <td className="py-3.5 px-4 font-normal text-slate-900 max-w-xs truncate">
                    {t.subject}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${t.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : t.priority === 'high'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                      {t.priority || 'Normal'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${t.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'resolved'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                      {t.status || 'open'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{
  activeTab === 'websites' && (
    <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 text-sm">Hosted Websites</h3>
          <p className="text-xs text-slate-500">Website deployments managed by this creator.</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {websites.length} website(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Website Name</th>
              <th className="py-3 px-4">Subdomain / Domain</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Storage Used</th>
              <th className="py-3 px-4">Published</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {websites.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No websites have been created by this creator yet.
                </td>
              </tr>
            ) : (
              websites.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{w.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">ID: #{w.id}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-slate-800 font-normal">{w.subdomain}</div>
                    {w.custom_domain && (
                      <div className="text-[11px] text-slate-500">
                        {w.custom_domain}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${w.status === 'active' || w.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                    >
                      {w.status || 'ACTIVE'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {w.storage_used_mb || 0} MB
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${w.is_published
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                      {w.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/developer/websites/${w.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-normal transition-colors"
                    >
                      <span>Manage Site</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
    </div >
  );
}
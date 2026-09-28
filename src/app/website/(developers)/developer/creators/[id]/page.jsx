'use client';

import { useState, useEffect, useContext, use } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiUser,
  BiEnvelope,
  BiPhone,
  BiCalendar,
  BiCheckCircle,
  BiXCircle,
  BiCube,
  BiDesktop,
  BiCreditCard,
  BiHeadphone,
  BiLinkExternal,
  BiShieldQuarter,
  BiShieldX,
  BiRefresh,
  BiHdd,
  BiDollarCircle,
  BiTimeFive,
  BiWorld,
  BiCopy,
  BiCheck,
  BiLockAlt,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function CreatorDetailsPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  // Support both useParams and direct props
  const creatorId = routeParams?.id || (params ? (typeof params.then === 'function' ? use(params)?.id : params.id) : null);

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAuthorized = permissions.includes('creators');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | subscriptions | websites | payments | support
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(null);

  const fetchCreatorDetails = async (isRefresh = false) => {
    if (!creatorId) return;
    try {
      if (isRefresh) setLoading(true);
      setError(null);
      const res = await fetch(`/api/developer/creators/${creatorId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
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

    fetch(`/api/developer/creators/${creatorId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success) {
            setData(json);
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
      const res = await fetch(`/api/developer/creators/${creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Role Access Denied Screen
  if (!isAuthorized && user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl">
            <BiShieldX />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Inspecting creator details requires the <span className="font-semibold text-slate-800 font-mono">creators</span> permission.
          </p>
          <Link
            href="/developer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            ← Return to Developer Overview
          </Link>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !data?.creator) {
    return (
      <div className="space-y-6">
        <Link
          href="/developer/creators"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>Back to Creators Directory</span>
        </Link>

        <div className="bg-white border border-rose-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl">
            <BiUser />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Creator Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            {error || `Unable to locate creator account with ID #${creatorId}. The record might have been deleted.`}
          </p>
          <Link
            href="/developer/creators"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold transition-colors"
          >
            Return to Creators Directory
          </Link>
        </div>
      </div>
    );
  }

  const { creator, activeSubscription, subscriptions = [], websites = [], payments = [], tickets = [], stats = {} } = data;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/developer/creators"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs"
        >
          <BiArrowBack className="text-base text-secondary" />
          <span>Back to Creators Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchCreatorDetails(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            title="Refresh details"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
          <Link
            href={`/creator/${creator.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Open Creator Panel</span>
            <BiLinkExternal className="text-sm" />
          </Link>
        </div>
      </div>

      {/* Creator Profile Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <p
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
                
              />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                  creator.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                title={creator.is_active ? 'Active Account' : 'Suspended Account'}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {creator.name}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  ID: #{creator.id}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 ${
                    creator.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {creator.is_active ? <BiCheckCircle className="text-xs" /> : <BiXCircle className="text-xs" />}
                  {creator.is_active ? 'Active' : 'Suspended'}
                </span>

                {creator.is_verified && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <BiCheckCircle className="text-xs" /> Verified
                  </span>
                )}

                {creator.two_factor_enabled && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <BiLockAlt className="text-xs" /> 2FA Active
                  </span>
                )}
              </div>

              {/* Email & Phone */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <BiEnvelope className="text-slate-400 text-sm" />
                  <span className="font-mono font-medium">{creator.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(creator.email, 'email')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Copy email"
                  >
                    {copiedText === 'email' ? (
                      <BiCheck className="text-emerald-600 text-sm" />
                    ) : (
                      <BiCopy className="text-xs" />
                    )}
                  </button>
                </div>

                {creator.phone && (
                  <div className="flex items-center gap-1.5">
                    <BiPhone className="text-slate-400 text-sm" />
                    <span className="font-mono font-medium">{creator.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-400">
                  <BiCalendar className="text-slate-400 text-sm" />
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

              {creator.bio && (
                <p className="text-xs text-slate-500 pt-2 max-w-2xl italic leading-relaxed">
                  &ldquo;{creator.bio}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex sm:flex-col items-center sm:items-end justify-start gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={actionLoading}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                creator.is_active
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } disabled:opacity-50`}
            >
              {creator.is_active ? <BiXCircle className="text-base" /> : <BiCheckCircle className="text-base" />}
              <span>{actionLoading ? 'Updating...' : creator.is_active ? 'Suspend Account' : 'Activate Account'}</span>
            </button>

            <a
              href={`mailto:${creator.email}`}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <BiEnvelope className="text-sm" />
              <span>Send Direct Email</span>
            </a>
          </div>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Plan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Package Plan</span>
            <BiCube className="text-secondary text-base" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2 truncate">
            {activeSubscription?.package_name || 'No Active Plan'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {activeSubscription
              ? `$${((activeSubscription.price_in_cents || 0) / 100).toFixed(2)} / ${activeSubscription.billing_interval || 'mo'}`
              : 'Free trial or inactive'}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Plan Status</span>
            <BiTimeFive className="text-indigo-500 text-base" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {activeSubscription?.status || 'INACTIVE'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.daysRemaining > 0 ? `${stats.daysRemaining} day(s) remaining` : 'Expired or not set'}
          </div>
        </div>

        {/* Hosted Websites */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Hosted Portfolios</span>
            <BiDesktop className="text-emerald-500 text-base" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {stats.totalWebsites || 0}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {stats.maxWebsites ? `${stats.maxWebsites} max` : 'Unlimited'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            {websites.filter((w) => w.is_published).length} Published site(s)
          </div>
        </div>

        {/* Storage Used */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Storage Used</span>
            <BiHdd className="text-amber-500 text-base" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {stats.totalStorageMb || 0} MB
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assets & site storage</div>
        </div>

        {/* Total Payments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Spend</span>
            <BiDollarCircle className="text-emerald-600 text-base" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            ${((stats.totalSpentCents || 0) / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.totalPayments || 0} payment transaction(s)
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex flex-wrap items-center gap-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-secondary text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BiUser className="text-sm" />
          <span>Account Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('websites')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'websites'
              ? 'bg-secondary text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BiDesktop className="text-sm" />
          <span>Hosted Websites ({websites.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-secondary text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BiCube className="text-sm" />
          <span>Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-secondary text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BiCreditCard className="text-sm" />
          <span>Payments ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'support'
              ? 'bg-secondary text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BiHeadphone className="text-sm" />
          <span>Support Tickets ({tickets.length})</span>
        </button>
      </div>

      {/* Tab 1: Account Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <BiUser className="text-secondary text-base" />
              <span>Identity & Contact Details</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Account ID:</span>
                <span className="font-mono font-bold text-slate-800">#{creator.id}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-semibold text-slate-800">{creator.name}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-mono text-slate-800">{creator.email}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-mono text-slate-800">{creator.phone || 'Not provided'}</span>
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

          {/* Security & Authentication Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <BiShieldQuarter className="text-secondary text-base" />
              <span>Security & Access Audit</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Account Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    creator.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {creator.is_active ? 'Active Access' : 'Access Suspended'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Identity Verification:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    creator.is_verified
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
                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    creator.two_factor_enabled
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {creator.two_factor_enabled ? '2FA Active' : 'Not Enabled'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Last Login Timestamp:</span>
                <span className="font-mono text-slate-700">
                  {creator.last_login_at ? new Date(creator.last_login_at).toLocaleString() : 'Never logged in'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Last Known IP:</span>
                <span className="font-mono text-slate-700">
                  {creator.last_login_ip || 'Not recorded'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hosted Websites */}
      {activeTab === 'websites' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Creator&apos;s Portfolio Websites</h3>
              <p className="text-xs text-slate-500">All portfolio instances provisioned by this creator.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {websites.length} website(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                        <div className="font-bold text-slate-900">{w.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: #{w.id}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-secondary font-semibold">{w.subdomain}.portfolio.local</div>
                        {w.custom_domain && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <BiWorld className="text-xs" /> {w.custom_domain}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            w.status === 'ACTIVE'
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            w.is_published
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
                          href={`/developer/websites?id=${w.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                        >
                          <span>Manage Site</span>
                          <BiLinkExternal className="text-xs" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Subscription Records</h3>
              <p className="text-xs text-slate-500">Package subscription history and active intervals.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        #{s.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.package_name || 'Standard Package'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Plan #{s.package_id}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            s.status === 'ACTIVE'
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

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        ${((s.price_in_cents || 0) / 100).toFixed(2)} / {s.billing_interval || 'mo'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            !s.cancel_at_period_end
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
      )}

      {/* Tab 4: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Payment Transactions</h3>
              <p className="text-xs text-slate-500">History of payments processed for this account.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {p.transaction_id || `#${p.id}`}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {p.package_name || `Package #${p.package_id}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ${((p.amount_in_cents || 0) / 100).toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-400">{p.currency || 'USD'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {p.payment_method || 'CARD'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            p.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Support Tickets */}
      {activeTab === 'support' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Creator Support Inquiries</h3>
              <p className="text-xs text-slate-500">Tickets submitted by this creator&apos;s verified email address.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No support tickets submitted by this creator.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        #{t.id}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {t.subject}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 capitalize">
                        {t.category || 'General'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            t.priority === 'urgent'
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            t.status === 'open'
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
      )}
    </div>
  );
}

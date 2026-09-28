'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import {
  BiSearch,
  BiRefresh,
  BiCheckCircle,
  BiXCircle,
  BiDesktop,
  BiCube,
  BiLinkExternal,
  BiShieldQuarter,
  BiShieldX,
  BiFilter,
  BiChevronRight,
  BiCopy,
  BiCheck,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function AdminCreatorsPage() {
  const { user } = useContext(Context);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | suspended
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAuthorized = permissions.includes('creators');

  const fetchCreators = async (isRefresh = false) => {
    try {
      if (isRefresh) setLoading(true);
      const res = await fetch('/api/developer/creators');
      const data = await res.json();
      if (data.success) {
        setCreators(data.creators || []);
      }
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!isAuthorized) {
      return;
    }

    fetch('/api/developer/creators')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.success) {
            setCreators(data.creators || []);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to fetch creators:', err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isAuthorized]);

  const handleToggleActive = async (creatorId) => {
    try {
      setActionLoadingId(creatorId);
      const res = await fetch('/api/developer/creators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, toggle_active: true }),
      });
      const data = await res.json();
      if (data.success) {
        setCreators((prev) =>
          prev.map((c) =>
            c.id === creatorId ? { ...c, is_active: !c.is_active } : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filtered creators list
  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.current_package?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.id).includes(searchTerm.trim());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.is_active) ||
        (statusFilter === 'suspended' && !c.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [creators, searchTerm, statusFilter]);

  // Aggregate stats
  const totalCount = creators.length;
  const activeCount = creators.filter((c) => c.is_active).length;
  const suspendedCount = totalCount - activeCount;
  const totalWebsites = creators.reduce((acc, c) => acc + Number(c.websites_count || 0), 0);

  // If user role is not authorized
  if (!isAuthorized && user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl">
            <BiShieldX />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Viewing the Creator Directory requires the <span className="font-semibold text-slate-800 font-mono">creators</span> permission.
          </p>
          <Link
            href="/developer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            ← Back to Developer Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-secondary font-medium mb-1.5">
            <Link href="/developer" className="hover:underline">Developer Overview</Link>
            <span>/</span>
            <span className="text-slate-600 font-semibold">Creators Directory</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registered Creators</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervise registered portfolio creators, verify account statuses, inspect active packages, and audit provisioned websites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchCreators(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <BiRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Creators</span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-base">
              <BiShieldQuarter />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered accounts</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Creators</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
              <BiCheckCircle />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">In good standing</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Suspended</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base">
              <BiXCircle />
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{suspendedCount}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Access disabled</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hosted Portfolios</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
              <BiDesktop />
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{totalWebsites}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all creators</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search creator by name, email, package or ID..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Suspended ({suspendedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Creators Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Creator Name</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Current Package</th>
                <th className="py-3.5 px-4 text-center">Websites</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-slate-300 border-t-secondary rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading registered creators...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCreators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">
                        <BiFilter />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">No creators found</div>
                      <p className="text-xs text-slate-500">
                        {searchTerm || statusFilter !== 'all'
                          ? 'No creators matched your search query or filter selection.'
                          : 'No creators have registered on the platform yet.'}
                      </p>
                      {(searchTerm || statusFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCreators.map((creator) => {
                  const isSuspended = !creator.is_active;
                  return (
                    <tr
                      key={creator.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Creator Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {creator.name ? creator.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-secondary transition-colors">
                                {creator.name}
                              </span>
                              {creator.is_verified && (
                                <span title="Verified Creator">
                                  <BiCheckCircle className="text-emerald-500 text-sm" />
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: #{creator.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 text-xs">
                            {creator.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(creator.email)}
                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                            title="Copy email address"
                          >
                            {copiedEmail === creator.email ? (
                              <BiCheck className="text-emerald-600 text-sm" />
                            ) : (
                              <BiCopy className="text-xs" />
                            )}
                          </button>
                        </div>
                        {creator.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {creator.phone}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              creator.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {creator.is_active ? (
                              <>
                                <BiCheckCircle className="text-xs" />
                                Active
                              </>
                            ) : (
                              <>
                                <BiXCircle className="text-xs" />
                                Suspended
                              </>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(creator.id)}
                            disabled={actionLoadingId === creator.id}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              creator.is_active
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            } disabled:opacity-50`}
                            title={
                              creator.is_active
                                ? 'Suspend creator access'
                                : 'Activate creator access'
                            }
                          >
                            {actionLoadingId === creator.id
                              ? 'Updating...'
                              : creator.is_active
                              ? 'Suspend'
                              : 'Activate'}
                          </button>
                        </div>
                      </td>

                      {/* Current Package */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <BiCube className="text-secondary text-sm" />
                          <span className="font-semibold text-slate-800">
                            {creator.current_package || 'No Plan'}
                          </span>
                        </div>
                        {creator.subscription_status && (
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {creator.subscription_status}
                          </span>
                        )}
                      </td>

                      {/* Websites count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <BiDesktop className="text-xs" />
                          {creator.websites_count || 0}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {creator.created_at
                          ? new Date(creator.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/developer/creators/${creator.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all shadow-xs"
                            title="View all details of this creator"
                          >
                            <span>Full View</span>
                            <BiChevronRight className="text-base" />
                          </Link>

                          <Link
                            href={`/creator/${creator.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Open Creator Portal in new tab"
                          >
                            <BiLinkExternal className="text-sm" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredCreators.length}</span> of{' '}
            <span className="font-bold text-slate-800">{creators.length}</span> creators
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active: {activeCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Suspended: {suspendedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

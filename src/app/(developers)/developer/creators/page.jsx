'use client';

import Link from 'next/link';
import { useState, useEffect, useContext, useMemo } from 'react';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
      const res = await fetch('/api/marketing/developer/creators');
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

    fetch('/api/marketing/developer/creators')
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
      const res = await fetch('/api/marketing/developer/creators', {
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
      <div className="w-full min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded p-6 text-center space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Viewing the Creator Directory requires the <span className="font-mono text-slate-800 dark:text-slate-200">creators</span> permission.
          </p>
          <div className="pt-2">
            <Link
              href="/developer"
              className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
            >
              Back to Developer Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500">
            <Link href="/developer" className="hover:underline">Developer Overview</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Creators Directory</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Registered Creators</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervise registered portfolio creators, verify account statuses, inspect active packages, and audit provisioned websites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchCreators(true)}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Creators</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered accounts</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Active Creators</div>
          <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In good standing</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Suspended</div>
          <div className="text-base font-semibold text-rose-600 dark:text-rose-400 mt-1">{suspendedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Access disabled</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Hosted Portfolios</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">{totalWebsites}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all creators</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search creator by name, email, package or ID..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800 font-normal"
            />
          </div>

          <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-normal'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 font-normal'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-700 font-normal'
              }`}
            >
              Suspended ({suspendedCount})
            </button>
          </div>
        </div>

        {/* Creators Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">Creator Name</th>
                <th className="pb-2 whitespace-nowrap">Email Address</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Current Package</th>
                <th className="pb-2 text-center whitespace-nowrap">Websites</th>
                <th className="pb-2 whitespace-nowrap">Registered Date</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading registered creators..." />
                  </td>
                </tr>
              ) : filteredCreators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs font-normal">
                    No creators found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCreators.map((creator) => {
                  return (
                    <tr
                      key={creator.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {creator.name}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: #{creator.id}
                        </span>
                      </td>

                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                            {creator.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(creator.email)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] font-normal cursor-pointer"
                            title="Copy email address"
                          >
                            {copiedEmail === creator.email ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        {creator.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {creator.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium uppercase ${
                              creator.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {creator.is_active ? 'Active' : 'Suspended'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(creator.id)}
                            disabled={actionLoadingId === creator.id}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              creator.is_active
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            } disabled:opacity-50`}
                          >
                            {actionLoadingId === creator.id
                              ? 'Updating...'
                              : creator.is_active
                              ? 'Suspend'
                              : 'Activate'}
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {creator.current_package || 'No Plan'}
                        </div>
                        {creator.subscription_status && (
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {creator.subscription_status}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {creator.websites_count || 0}
                        </span>
                      </td>

                      <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {creator.created_at
                          ? new Date(creator.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/developer/creators/${creator.id}`}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
                          >
                            Full View
                          </Link>

                          <Link
                            href={`/creator/${creator.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                          >
                            Open Portal
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
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing {filteredCreators.length} of {creators.length} creators
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Active: {activeCount}</span>
            <span>Suspended: {suspendedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

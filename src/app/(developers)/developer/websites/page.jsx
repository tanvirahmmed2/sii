'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';
import {
  FiGlobe,
  FiSearch,
  FiRefreshCw,
  FiExternalLink,
  FiShield,
  FiArrowLeft,
  FiTrash2,
  FiSettings,
  FiUser,
  FiPackage,
  FiHardDrive,
  FiActivity
} from 'react-icons/fi';

export default function AdminWebsitesPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1 || String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' || permissions.includes('*');
  const canView = isOwner || permissions.includes('websites') || permissions.includes('website');
  const canDelete = isOwner || permissions.includes('websites_delete') || permissions.includes('websites') || permissions.includes('website');

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';

  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const fetchWebsites = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/websites');
      const data = await res.json();
      if (data.success) {
        setWebsites(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!canView) return;

    fetch('/api/marketing/developer/websites')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.success) {
            setWebsites(data.records || []);
          }
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!ignore) {
          console.error(e);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [canView]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete website "${name || id}"? All associated domains and records will be deleted.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/websites?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchWebsites(false);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  if (!canView && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiShield />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">You require website viewing permissions to access this directory.</p>
          <Link
            href="/developer/overview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Overview
          </Link>
        </div>
      </div>
    );
  }

  const filtered = websites.filter((w) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      w.name?.toLowerCase().includes(q) ||
      w.subdomain?.toLowerCase().includes(q) ||
      w.custom_domain?.toLowerCase().includes(q) ||
      w.creator_name?.toLowerCase().includes(q) ||
      w.creator_email?.toLowerCase().includes(q) ||
      w.eiin_number?.toLowerCase().includes(q) ||
      String(w.creator_id).includes(q) ||
      String(w.id).includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      String(w.status).toLowerCase() === statusFilter.toLowerCase();

    const matchesMode =
      modeFilter === 'ALL' ||
      (modeFilter === 'ONLINE' && Boolean(w.is_published)) ||
      (modeFilter === 'MAINTENANCE' && !w.is_published);

    return matchesSearch && matchesStatus && matchesMode;
  });

  const totalSites = websites.length;
  const activeSites = websites.filter((w) => String(w.status).toLowerCase() === 'active').length;
  const onlineSites = websites.filter((w) => Boolean(w.is_published)).length;
  const maintenanceSites = websites.filter((w) => !w.is_published).length;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Hosted Websites Directory</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Websites &amp; Audience
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View all tenant institution portals, domain mappings, allocations, and open detailed controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchWebsites(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <FiRefreshCw className="text-xs" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Portals</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{totalSites}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Active Status</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{activeSites}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Public Online</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{onlineSites}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Maintenance Mode</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{maintenanceSites}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                <FiSearch />
              </span>
              <input
                type="text"
                aria-label="Search websites"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 font-normal"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>

              <select
                aria-label="Filter by Mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="ALL">All Modes</option>
                <option value="ONLINE">Online (Public)</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing {filtered.length} of {websites.length} websites
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Website &amp; Institution</th>
                <th className="pb-2 whitespace-nowrap">Domains</th>
                <th className="pb-2 whitespace-nowrap">Owner (Creator)</th>
                <th className="pb-2 whitespace-nowrap">Plan &amp; Storage</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Mode</th>
                <th className="pb-2 text-right whitespace-nowrap">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading websites..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No matching websites found.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-mono font-medium">
                      <Link
                        href={`/developer/websites/${w.id}`}
                        className="text-slate-900 dark:text-white hover:underline font-semibold"
                      >
                        #{w.id}
                      </Link>
                    </td>

                    <td className="py-2.5 font-medium">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center -space-x-1 flex-shrink-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 shadow-xs inline-block"
                              style={{ backgroundColor: w.primary_color || '#1e40af' }}
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 shadow-xs inline-block"
                              style={{ backgroundColor: w.secondary_color || '#0ea5e9' }}
                            />
                          </div>
                          <Link
                            href={`/developer/websites/${w.id}`}
                            className="text-slate-900 dark:text-white hover:underline font-semibold"
                          >
                            {w.name}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {w.institution_type || 'School'} {w.eiin_number ? `• EIIN: ${w.eiin_number}` : ''}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 font-mono text-[11px]">
                      <div className="space-y-0.5">
                        <div className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <FiGlobe className="text-slate-400 text-[10px]" />
                          <span>{w.subdomain}.{baseDomain}</span>
                        </div>
                        {w.custom_domain && (
                          <div className="text-slate-500 flex items-center gap-1">
                            <span>{w.custom_domain}</span>
                            {w.custom_domain_verified ? (
                              <span className="text-[9px] text-emerald-600 font-bold uppercase">(Verified)</span>
                            ) : (
                              <span className="text-[9px] text-amber-600 font-bold uppercase">(Pending)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5">
                      {w.creator_id ? (
                        <Link
                          href={`/developer/creators/${w.creator_id}`}
                          className="hover:underline space-y-0.5 block"
                        >
                          <div className="font-medium text-slate-900 dark:text-white">
                            {w.creator_name || `Creator #${w.creator_id}`}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{w.creator_email}</div>
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-normal">Unassigned</span>
                      )}
                    </td>

                    <td className="py-2.5 font-mono text-[11px]">
                      <div className="space-y-0.5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {w.package_name || 'Standard Tier'}
                        </div>
                        <div className="text-slate-400">{w.storage_used_mb ?? 0} MB used</div>
                      </div>
                    </td>

                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded border text-[9px] font-semibold uppercase ${
                          String(w.status).toLowerCase() === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                            : String(w.status).toLowerCase() === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                            : String(w.status).toLowerCase() === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {w.status || 'active'}
                      </span>
                    </td>

                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded border text-[9px] font-semibold uppercase ${
                          w.is_published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                        }`}
                      >
                        {w.is_published ? 'Online' : 'Maintenance'}
                      </span>
                    </td>

                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/developer/websites/${w.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium transition-colors"
                        >
                          <FiSettings className="text-[11px]" />
                          <span>Control &amp; Manage</span>
                        </Link>

                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingId === w.id}
                            onClick={() => handleDelete(w.id, w.name)}
                            className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete website container"
                          >
                            <FiTrash2 className="text-[11px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

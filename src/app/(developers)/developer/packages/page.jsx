'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import PackageForm from 'src/component/marketing/developer/forms/PackageForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function AdminPackagesPage() {
  const { user } = useContext(Context) || {};
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminUser = Boolean(permissions.includes('packages'));
  const router = useRouter();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('PRICE_ASC');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/packages');
      const data = await res.json();
      if (data.success) {
        setPackages(data.records || []);
      }
    } catch (e) {
      console.error('Failed to fetch packages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleToggleStatus = async (pkg) => {
    if (!isAdminUser) {
      showFeedback('Access Denied: packages permission required to toggle package status.');
      return;
    }
    setTogglingId(pkg.id);
    try {
      const res = await fetch('/api/marketing/developer/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkg.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPackages((prev) =>
          prev.map((item) => (item.id === pkg.id ? { ...item, is_active: !item.is_active } : item))
        );
        showFeedback(`Package "${pkg.name}" status updated.`);
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } catch (e) {
      console.error('Error toggling package status:', e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!isAdminUser) {
      showFeedback('Access Denied: packages permission required to delete packages.');
      return;
    }
    if (!confirm(`Are you sure you want to delete package "${name || `#${id}`}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch('/api/marketing/developer/packages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
        showFeedback(`Package "${name}" was successfully deleted.`);
      } else {
        alert(data.error || 'Failed to delete package');
      }
    } catch (e) {
      console.error('Error deleting package:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const filtered = useMemo(() => {
    return packages
      .filter((pkg) => {
        const matchesSearch =
          !searchTerm.trim() ||
          pkg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.tagline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (Array.isArray(pkg.tenant_modules) &&
            pkg.tenant_modules.some((m) => (m.name || m).toLowerCase().includes(searchTerm.toLowerCase()))) ||
          (Array.isArray(pkg.allowed_modules) &&
            pkg.allowed_modules.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase())));

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && pkg.is_active !== false) ||
          (statusFilter === 'DISABLED' && pkg.is_active === false);

        const matchesVisibility =
          visibilityFilter === 'ALL' ||
          (visibilityFilter === 'PUBLIC' && pkg.is_public !== false) ||
          (visibilityFilter === 'CUSTOM' && pkg.is_public === false);

        return matchesSearch && matchesStatus && matchesVisibility;
      })
      .sort((a, b) => {
        const getMonthlyPrice = (item) =>
          Number(
            item.monthly_price_usd !== undefined
              ? item.monthly_price_usd
              : item.monthly_price !== undefined
              ? item.monthly_price
              : 0
          ) || 0;

        if (sortOrder === 'PRICE_DESC') {
          const diff = getMonthlyPrice(b) - getMonthlyPrice(a);
          return diff !== 0 ? diff : (Number(b.id) || 0) - (Number(a.id) || 0);
        }
        if (sortOrder === 'NEWEST') {
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }
        if (sortOrder === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '');
        }

        // Default: PRICE_ASC
        const diff = getMonthlyPrice(a) - getMonthlyPrice(b);
        return diff !== 0 ? diff : (Number(a.id) || 0) - (Number(b.id) || 0);
      });
  }, [packages, searchTerm, statusFilter, sortOrder]);

  // Statistics calculation
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.is_active !== false).length;
  const avgMonthlyUsd =
    packages.length > 0
      ? (
          packages.reduce(
            (acc, p) =>
              acc +
              Number(
                p.monthly_price_usd !== undefined
                  ? p.monthly_price_usd
                  : p.monthly_price !== undefined
                  ? p.monthly_price
                  : 0
              ),
            0
          ) / packages.length
        ).toFixed(2)
      : '0.00';

  const avgMonthlyBdt =
    packages.length > 0
      ? (
          packages.reduce(
            (acc, p) => acc + Number(p.monthly_price_bdt !== undefined ? p.monthly_price_bdt : 0),
            0
          ) / packages.length
        ).toFixed(0)
      : '0';

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded shadow-lg border border-slate-700 text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Platform Packages &amp; Plans
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Billing Tiers
            </span>
            {!isAdminUser && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, update, and govern multi-tenant SaaS subscription packages, dual-currency pricing (BDT &amp; USD), institutional quotas, and linked tenant modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPackages}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
          {isAdminUser ? (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer transition-colors"
            >
              {showCreateForm ? 'Close Form' : 'Create Package'}
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
              Admin Role Required
            </div>
          )}
        </div>
      </div>

      {/* Inline Create Package Form */}
      {showCreateForm && (
        <PackageForm
          onSuccess={(newPkg) => {
            setShowCreateForm(false);
            showFeedback(`Package "${newPkg?.name}" created successfully!`);
            fetchPackages();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Metrics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Plans</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">{totalPackages}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Configured subscription tiers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Active Tiers</div>
          <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{activePackages}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Published for checkout</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Avg USD Monthly</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1 font-mono">${avgMonthlyUsd}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Average dollar rate</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Avg BDT Monthly</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1 font-mono">৳{avgMonthlyBdt}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Average Taka rate</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        {/* Table Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search packages by name, tagline, or module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Visibility Filter */}
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
              title="Filter by visibility"
            >
              <option value="ALL">All Visibility</option>
              <option value="PUBLIC">Public Only</option>
              <option value="CUSTOM">Custom / Private</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled Only</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
              title="Sort packages order"
            >
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="NEWEST">Newest First</option>
            </select>

            <div className="text-xs text-slate-500 font-medium pl-1 hidden sm:block whitespace-nowrap">
              {filtered.length} of {packages.length}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Package Tier</th>
                <th className="pb-2 whitespace-nowrap">USD Pricing ($)</th>
                <th className="pb-2 whitespace-nowrap">BDT Pricing (৳)</th>
                <th className="pb-2 whitespace-nowrap">Capacity</th>
                <th className="pb-2 whitespace-nowrap">Linked Modules</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Created</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading packages from database..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No packages found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((pkg) => {
                  const isRowActive = pkg.is_active !== false;

                  const modulesList =
                    Array.isArray(pkg.tenant_modules) && pkg.tenant_modules.length > 0
                      ? pkg.tenant_modules.map((m) => m.name || m)
                      : Array.isArray(pkg.allowed_modules)
                      ? pkg.allowed_modules
                      : [];

                  const monthlyUsd = Number(pkg.monthly_price_usd ?? pkg.monthly_price ?? 0);
                  const yearlyUsd = Number(pkg.yearly_price_usd ?? pkg.yearly_price ?? 0);
                  const monthlyBdt = Number(pkg.monthly_price_bdt ?? 0);
                  const yearlyBdt = Number(pkg.yearly_price_bdt ?? 0);

                  return (
                    <tr
                      key={pkg.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 font-mono font-medium text-slate-400">#{pkg.id}</td>

                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/developer/packages/${pkg.slug}`}
                            className="font-medium text-slate-900 dark:text-white hover:underline block truncate"
                            title="Open Plan Workspace"
                          >
                            {pkg.name}
                          </Link>
                          {pkg.is_public === false ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200">
                              Custom Plan
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Public
                            </span>
                          )}
                          {pkg.is_popular && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200">
                              Popular
                            </span>
                          )}
                        </div>
                        {pkg.tagline ? (
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                            {pkg.tagline}
                          </div>
                        ) : pkg.description ? (
                          <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                            {pkg.description}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-2.5">
                        <div className="font-mono font-medium text-slate-900 dark:text-white text-xs">
                          ${monthlyUsd.toFixed(2)} USD<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ${yearlyUsd.toFixed(2)} USD<span className="text-[9px] text-slate-400 font-normal">/yr</span>
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="font-mono font-medium text-slate-900 dark:text-white text-xs">
                          ৳{monthlyBdt.toFixed(2)} BDT<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ৳{yearlyBdt.toFixed(2)} BDT<span className="text-[9px] text-slate-400 font-normal">/yr</span>
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {pkg.max_students || 500} Students
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {pkg.max_teachers || 30} Teachers &bull; {pkg.max_storage_mb || 5120} MB &bull; {pkg.grace_period ?? 3}d Grace
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {modulesList.length > 0 ? (
                            <>
                              {modulesList.slice(0, 2).map((mod) => (
                                <span
                                  key={mod}
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {mod}
                                </span>
                              ))}
                              {modulesList.length > 2 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  title={modulesList.slice(2).join(', ')}
                                >
                                  +{modulesList.length - 2} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No modules linked</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5">
                        <button
                          type="button"
                          disabled={togglingId === pkg.id || !isAdminUser}
                          onClick={() => handleToggleStatus(pkg)}
                          className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium transition-colors ${
                            !isAdminUser ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                          } ${
                            isRowActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                          }`}
                          title={isAdminUser ? 'Click to toggle status' : 'packages permission required to toggle status'}
                        >
                          {togglingId === pkg.id ? 'Updating...' : isRowActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      <td className="py-2.5 text-slate-500 text-[11px] font-mono">
                        {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-2.5 text-right whitespace-nowrap">
                        {isAdminUser ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/developer/packages/${pkg.slug}`}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              disabled={deletingId === pkg.id}
                              onClick={() => handleDelete(pkg.id, pkg.name)}
                              className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

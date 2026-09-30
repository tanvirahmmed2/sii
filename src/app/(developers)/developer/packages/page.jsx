'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import {
  BiSearch,
  BiPlus,
  BiTrash,
  BiRefresh,
  BiEdit,
  BiCube,
  BiCheckCircle,
  BiXCircle,
  BiDollarCircle,
  BiLayer,
  BiLockAlt,
  BiLoaderAlt,
  BiGroup,
  BiX,
} from 'react-icons/bi';
import PackageForm from 'src/component/marketing/developer/forms/PackageForm';

export default function AdminPackagesPage() {
  const { user } = useContext(Context) || {};
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminUser = Boolean(permissions.includes('packages'));
  const router = useRouter();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

        return matchesSearch && matchesStatus;
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
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold animate-fade-in">
          <BiCheckCircle className="text-emerald-400 text-base" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Platform Packages &amp; Plans
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Billing Tiers
            </span>
            {!isAdminUser && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <BiLockAlt className="text-xs" />
                <span>Read-Only</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Create, update, and govern multi-tenant SaaS subscription packages, dual-currency pricing (BDT &amp; USD), institutional quotas, and linked tenant modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPackages}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh packages"
          >
            <BiRefresh className="text-xl" />
          </button>
          {isAdminUser ? (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer"
              title="Toggle Package Creation Form"
            >
              {showCreateForm ? <BiX className="text-base" /> : <BiPlus className="text-base" />}
              <span>{showCreateForm ? 'Close Form' : 'Create Package'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
              <BiLockAlt className="text-sm" />
              <span>Admin Role Required</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Plans</span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <BiCube className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalPackages}</div>
          <p className="text-[11px] text-slate-400 mt-1">Configured subscription tiers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Tiers</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <BiCheckCircle className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{activePackages}</div>
          <p className="text-[11px] text-slate-400 mt-1">Published for checkout</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg USD Monthly</span>
            <div className="p-2 rounded-xl bg-primary/20 text-primary-dark">
              <BiDollarCircle className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">${avgMonthlyUsd}</div>
          <p className="text-[11px] text-slate-400 mt-1">Average dollar rate</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg BDT Monthly</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <BiGroup className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">৳{avgMonthlyBdt}</div>
          <p className="text-[11px] text-slate-400 mt-1">Average Taka rate</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="relative flex-1 max-w-md">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search packages by name, tagline, or module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled Only</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-secondary cursor-pointer"
              title="Sort packages order"
            >
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="NEWEST">Newest First</option>
            </select>

            <div className="text-xs text-slate-500 font-medium pl-2 hidden sm:block">
              <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> of {packages.length}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5 whitespace-nowrap">ID</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Package Tier</th>
                <th className="px-5 py-3.5 whitespace-nowrap">USD Pricing ($)</th>
                <th className="px-5 py-3.5 whitespace-nowrap">BDT Pricing (৳)</th>
                <th className="px-5 py-3.5 whitespace-nowrap">School Capacity</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Linked Tenant Modules</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Created</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Loading packages from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BiCube className="text-3xl text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-semibold">No packages found matching your criteria.</span>
                    </div>
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
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-slate-400">#{pkg.id}</td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/developer/packages/${pkg.slug}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-secondary block truncate"
                            title="Open Plan Workspace"
                          >
                            {pkg.name}
                          </Link>
                          {pkg.is_popular && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
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

                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          ${monthlyUsd.toFixed(2)}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ${yearlyUsd.toFixed(2)}<span className="text-[9px] text-slate-400 font-normal">/yr</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          ৳{monthlyBdt.toFixed(2)}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ৳{yearlyBdt.toFixed(2)}<span className="text-[9px] text-slate-400 font-normal">/yr</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {pkg.max_students || 500} Students
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {pkg.max_teachers || 30} Teachers &bull; {pkg.max_storage_mb || 5120} MB
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {modulesList.length > 0 ? (
                            <>
                              {modulesList.slice(0, 2).map((mod) => (
                                <span
                                  key={mod}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary/10 text-secondary border border-secondary/20"
                                >
                                  {mod}
                                </span>
                              ))}
                              {modulesList.length > 2 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-help"
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

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={togglingId === pkg.id || !isAdminUser}
                          onClick={() => handleToggleStatus(pkg)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                            !isAdminUser ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                          } ${
                            isRowActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title={isAdminUser ? 'Click to toggle status' : 'packages permission required to toggle status'}
                        >
                          {isRowActive ? (
                            <BiCheckCircle className="text-xs text-emerald-600" />
                          ) : (
                            <BiXCircle className="text-xs text-slate-400" />
                          )}
                          <span>{togglingId === pkg.id ? 'Updating...' : isRowActive ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-slate-500 text-[11px]">
                        {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {isAdminUser ? (
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/developer/packages/${pkg.slug}`}
                              className="p-1.5 text-slate-500 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit Package in Workspace"
                            >
                              <BiEdit className="text-base" />
                            </Link>

                            <button
                              type="button"
                              disabled={deletingId === pkg.id}
                              onClick={() => handleDelete(pkg.id, pkg.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Delete package"
                            >
                              <BiTrash className="text-base" />
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

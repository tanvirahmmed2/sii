'use client';
import { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

function getModulePermissions(user: any, moduleKey: any) {
  if (!user) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, canManage: false };
  }
  const isOwner =
    Number(user.id) === 1 ||
    String(user.email || '').toLowerCase() === 'tanvir004006@gmail.com' ||
    (Array.isArray(user.permissions) && user.permissions.includes('*'));
  if (isOwner) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true, canManage: true };
  }
  const keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
  for (const k of keys) {
    const p = user.permissionsMap?.[k];
    if (p) {
      return {
        canView: Boolean(p.can_view),
        canCreate: Boolean(p.can_create),
        canEdit: Boolean(p.can_edit),
        canDelete: Boolean(p.can_delete),
        canManage: Boolean(p.can_create && p.can_edit && p.can_delete),
      };
    }
  }
  const perms = (user.permissions || []).map((x: any) => String(x).toLowerCase().trim());
  const found = keys.some((k: any) => perms.includes(String(k).toLowerCase()));
  if (found) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true, canManage: true };
  }
  return { canView: false, canCreate: false, canEdit: false, canDelete: false, canManage: false };
}

export default function DeveloperPromosPage() {
  const { user } = useContext<any>(Context) || {};
  const { canView, canCreate, canEdit, canDelete } = getModulePermissions(user, [
    'promos',
    'promo',
    'promo-codes',
    'promo_usages',
    'packages',
    'billing',
  ]);

  const [promos, setPromos] = useState<any[]>([]);
  const [usages, setUsages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalPromos: 0,
    activePromos: 0,
    publicPromos: 0,
    privatePromos: 0,
    totalUsages: 0,
    totalDiscountGranted: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'promos' | 'usages'>('promos');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<string>('NEWEST');

  const [usagesSearchTerm, setUsagesSearchTerm] = useState<string>('');
  const [usagesPromoFilter, setUsagesPromoFilter] = useState<string>('ALL');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discount_percentage: '20',
    max_uses_per_creator: '1',
    max_total_uses: '',
    is_public: false,
    is_active: true,
    start_date: new Date().toISOString().slice(0, 10),
    ending_date: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchPromosData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/promos');
      const data = await res.json();
      if (data.success) {
        setPromos(data.promos || []);
        setUsages(data.usages || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        showNotification(data.error || 'Failed to fetch promo data', 'error');
      }
    } catch (err: any) {
      showNotification('Network error while fetching promo data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromosData();
  }, []);

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      discount_percentage: '20',
      max_uses_per_creator: '1',
      max_total_uses: '',
      is_public: false,
      is_active: true,
      start_date: new Date().toISOString().slice(0, 10),
      ending_date: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    });
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (promo: any) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name || '',
      code: promo.code || '',
      description: promo.description || '',
      discount_percentage: String(promo.discount_percentage ?? '20'),
      max_uses_per_creator: String(promo.max_uses_per_creator ?? '1'),
      max_total_uses: promo.max_total_uses ? String(promo.max_total_uses) : '',
      is_public: Boolean(promo.is_public),
      is_active: promo.is_active !== false,
      start_date: promo.start_date ? new Date(promo.start_date).toISOString().slice(0, 10) : '',
      ending_date: promo.ending_date ? new Date(promo.ending_date).toISOString().slice(0, 10) : '',
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSavePromo = async (e: any) => {
    e.preventDefault();
    setModalError(null);

    const name = formData.name.trim();
    const code = formData.code.trim().toUpperCase();
    const discountVal = Number(formData.discount_percentage);

    if (!name) {
      setModalError('Campaign name is required.');
      return;
    }
    if (!code) {
      setModalError('Promo coupon code is required.');
      return;
    }
    if (isNaN(discountVal) || discountVal <= 0 || discountVal > 100) {
      setModalError('Discount percentage must be between 1 and 100.');
      return;
    }

    try {
      setIsSaving(true);
      const url = '/api/marketing/developer/promos';
      const method = editingPromo ? 'PUT' : 'POST';
      const payload: any = {
        name,
        code,
        description: formData.description.trim(),
        discount_percentage: discountVal,
        max_uses_per_creator: Math.max(1, Number(formData.max_uses_per_creator) || 1),
        max_total_uses: formData.max_total_uses ? Math.max(1, Number(formData.max_total_uses)) : null,
        is_public: formData.is_public,
        is_active: formData.is_active,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        ending_date: formData.ending_date ? new Date(formData.ending_date).toISOString() : null,
      };

      if (editingPromo) {
        payload.id = editingPromo.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        showNotification(
          editingPromo
            ? `Promo code "${code}" updated successfully.`
            : `Promo code "${code}" created successfully.`
        );
        fetchPromosData();
      } else {
        setModalError(data.error || 'Failed to save promo code.');
      }
    } catch (err: any) {
      setModalError('Network error while saving promo code.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (promo: any) => {
    if (!canEdit) {
      showNotification('Access Denied: Edit permission required to change promo status.', 'error');
      return;
    }
    try {
      setTogglingId(promo.id);
      const res = await fetch('/api/marketing/developer/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, toggleActive: true }),
      });
      const data = await res.json();
      if (data.success) {
        setPromos((prev) =>
          prev.map((item) => (item.id === promo.id ? { ...item, is_active: !item.is_active } : item))
        );
        showNotification(`Promo "${promo.code}" status toggled.`);
      } else {
        showNotification(data.error || 'Failed to toggle promo status', 'error');
      }
    } catch (err: any) {
      showNotification('Network error while toggling promo status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleVisibility = async (promo: any) => {
    if (!canEdit) {
      showNotification('Access Denied: Edit permission required to change promo visibility.', 'error');
      return;
    }
    try {
      setTogglingId(promo.id);
      const res = await fetch('/api/marketing/developer/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, togglePublic: true }),
      });
      const data = await res.json();
      if (data.success) {
        setPromos((prev) =>
          prev.map((item) => (item.id === promo.id ? { ...item, is_public: !item.is_public } : item))
        );
        showNotification(`Promo "${promo.code}" visibility toggled.`);
      } else {
        showNotification(data.error || 'Failed to toggle promo visibility', 'error');
      }
    } catch (err: any) {
      showNotification('Network error while toggling promo visibility', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeletePromo = async () => {
    if (!deleteConfirmModal) return;
    if (!canDelete) {
      showNotification('Access Denied: Delete permission required for promos.', 'error');
      setDeleteConfirmModal(null);
      return;
    }
    try {
      setIsDeleting(true);
      const res = await fetch('/api/marketing/developer/promos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirmModal.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPromos((prev) => prev.filter((p) => p.id !== deleteConfirmModal.id));
        showNotification(`Promo "${deleteConfirmModal.code}" was successfully deleted.`);
        setDeleteConfirmModal(null);
      } else {
        showNotification(data.error || 'Failed to delete promo code', 'error');
      }
    } catch (err: any) {
      showNotification('Network error while deleting promo code', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filteredPromos = useMemo(() => {
    return promos
      .filter((promo) => {
        const matchesSearch =
          !searchTerm.trim() ||
          (promo.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (promo.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (promo.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && promo.is_active !== false) ||
          (statusFilter === 'INACTIVE' && promo.is_active === false);

        const matchesVisibility =
          visibilityFilter === 'ALL' ||
          (visibilityFilter === 'PUBLIC' && promo.is_public === true) ||
          (visibilityFilter === 'PRIVATE' && !promo.is_public);

        return matchesSearch && matchesStatus && matchesVisibility;
      })
      .sort((a, b) => {
        if (sortOrder === 'NEWEST') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sortOrder === 'DISCOUNT_DESC') {
          return Number(b.discount_percentage || 0) - Number(a.discount_percentage || 0);
        }
        if (sortOrder === 'DISCOUNT_ASC') {
          return Number(a.discount_percentage || 0) - Number(b.discount_percentage || 0);
        }
        if (sortOrder === 'MOST_USED') {
          return Number(b.total_usages_count || 0) - Number(a.total_usages_count || 0);
        }
        if (sortOrder === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [promos, searchTerm, statusFilter, visibilityFilter, sortOrder]);

  const filteredUsages = useMemo(() => {
    return usages.filter((usage) => {
      const matchesSearch =
        !usagesSearchTerm.trim() ||
        (usage.promo_code || '').toLowerCase().includes(usagesSearchTerm.toLowerCase()) ||
        (usage.creator_name || '').toLowerCase().includes(usagesSearchTerm.toLowerCase()) ||
        (usage.creator_email || '').toLowerCase().includes(usagesSearchTerm.toLowerCase()) ||
        (usage.invoice_no || '').toLowerCase().includes(usagesSearchTerm.toLowerCase());

      const matchesPromo =
        usagesPromoFilter === 'ALL' ||
        (usage.promo_code || '').toUpperCase() === usagesPromoFilter.toUpperCase();

      return matchesSearch && matchesPromo;
    });
  }, [usages, usagesSearchTerm, usagesPromoFilter]);

  const distinctPromoCodes = useMemo(() => {
    const set = new Set<string>();
    usages.forEach((u) => {
      if (u.promo_code) set.add(u.promo_code);
    });
    return Array.from(set).sort();
  }, [usages]);

  if (!canView) {
    return (
      <div className="w-full p-6 flex items-center justify-center min-h-[500px]">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600 mb-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Permission Required</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Your developer role does not have viewing permissions for the Promos &amp; Discounts module. Contact a super administrator to request access.
          </p>
          <div className="pt-2">
            <Link
              href="/developer"
              className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Promotions &amp; Discounts Management
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Marketing
            </span>
            {!canCreate && !canEdit && !canDelete && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure promotional voucher codes, percentage discounts, creator redemption limits, and monitor checkout usages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPromosData}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
            >
              New Promo
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded text-xs font-medium border ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            Total Campaigns
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">
            {stats.totalPromos ?? promos.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">All registered codes</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            Active Codes
          </div>
          <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.activePromos ?? promos.filter((p) => p.is_active).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Redeemable at checkout</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            Public Offers
          </div>
          <div className="text-base font-semibold text-blue-600 dark:text-blue-400 mt-1">
            {stats.publicPromos ?? promos.filter((p) => p.is_public).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Homepage sliders</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            Total Usages
          </div>
          <div className="text-base font-semibold text-purple-600 dark:text-purple-400 mt-1">
            {stats.totalUsages ?? usages.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Checkout redemptions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            Discount Granted
          </div>
          <div className="text-base font-semibold text-amber-600 dark:text-amber-400 mt-1 font-mono">
            ৳{Number(stats.totalDiscountGranted || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total creator savings</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('promos')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'promos'
              ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Promos Directory ({promos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('usages')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'usages'
              ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Redemption History ({usages.length})
        </button>
      </div>

      {activeTab === 'promos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Search Promo Campaigns
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Visibility
                </label>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Visibility</option>
                  <option value="PUBLIC">Public Only</option>
                  <option value="PRIVATE">Private Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Sort By
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="DISCOUNT_DESC">Discount: High to Low</option>
                  <option value="DISCOUNT_ASC">Discount: Low to High</option>
                  <option value="MOST_USED">Most Usages</option>
                  <option value="NAME_ASC">Name (A-Z)</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium pl-1 hidden sm:block whitespace-nowrap pt-4">
                {filteredPromos.length} of {promos.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2 whitespace-nowrap">Coupon Code</th>
                  <th className="pb-2 whitespace-nowrap">Campaign Name</th>
                  <th className="pb-2 whitespace-nowrap">Discount</th>
                  <th className="pb-2 whitespace-nowrap">Usages / Limit</th>
                  <th className="pb-2 whitespace-nowrap">Visibility</th>
                  <th className="pb-2 whitespace-nowrap">Status</th>
                  <th className="pb-2 whitespace-nowrap">Validity Period</th>
                  <th className="pb-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <LoadingScreen fullScreen={false} size="sm" label="Loading promo directory..." />
                    </td>
                  </tr>
                ) : filteredPromos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">
                      No promo campaigns found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPromos.map((promo) => {
                    const isExpired = promo.ending_date && new Date(promo.ending_date).getTime() < Date.now();
                    const usagesCount = Number(promo.total_usages_count || 0);
                    const isCopied = copiedCode === promo.code;

                    return (
                      <tr key={promo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            <span className="font-mono font-bold text-slate-900 dark:text-white tracking-wide">
                              {promo.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(promo.code)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Copy code"
                            >
                              {isCopied ? (
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5">
                          <div className="font-medium text-slate-900 dark:text-white truncate max-w-xs">
                            {promo.name}
                          </div>
                          {promo.description && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {promo.description}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {promo.discount_percentage}% OFF
                          </span>
                        </td>

                        <td className="py-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {usagesCount} redeemed
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Max {promo.max_uses_per_creator || 1}/creator
                            {promo.max_total_uses ? ` • Cap: ${promo.max_total_uses}` : ''}
                          </div>
                        </td>

                        <td className="py-2.5">
                          <button
                            type="button"
                            disabled={togglingId === promo.id || !canEdit}
                            onClick={() => handleToggleVisibility(promo)}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              !canEdit ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            } ${
                              promo.is_public
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                            title={canEdit ? 'Click to toggle public visibility' : 'Edit permission required'}
                          >
                            {promo.is_public ? 'Public Banner' : 'Private'}
                          </button>
                        </td>

                        <td className="py-2.5">
                          <button
                            type="button"
                            disabled={togglingId === promo.id || !canEdit}
                            onClick={() => handleToggleStatus(promo)}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              !canEdit ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            } ${
                              promo.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                            title={canEdit ? 'Click to toggle active status' : 'Edit permission required'}
                          >
                            {togglingId === promo.id ? 'Saving...' : promo.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>

                        <td className="py-2.5">
                          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                            {promo.ending_date ? new Date(promo.ending_date).toLocaleDateString() : 'Permanent'}
                          </div>
                          {isExpired && (
                            <span className="inline-block text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                              Expired
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditModal(promo)}
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmModal(promo)}
                                className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'usages' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Search Creator, Invoice, or Coupon
              </label>
              <input
                type="text"
                value={usagesSearchTerm}
                onChange={(e) => setUsagesSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 self-end">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Filter by Promo Code
                </label>
                <select
                  value={usagesPromoFilter}
                  onChange={(e) => setUsagesPromoFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Promo Codes</option>
                  {distinctPromoCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium pl-1 hidden sm:block whitespace-nowrap pt-4">
                {filteredUsages.length} of {usages.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2 whitespace-nowrap">ID / Timestamp</th>
                  <th className="pb-2 whitespace-nowrap">Promo Applied</th>
                  <th className="pb-2 whitespace-nowrap">Creator Details</th>
                  <th className="pb-2 whitespace-nowrap">Invoice Reference</th>
                  <th className="pb-2 whitespace-nowrap">Payment Total</th>
                  <th className="pb-2 text-right whitespace-nowrap">Discount Granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <LoadingScreen fullScreen={false} size="sm" label="Loading redemptions history..." />
                    </td>
                  </tr>
                ) : filteredUsages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-normal">
                      No promo redemptions found.
                    </td>
                  </tr>
                ) : (
                  filteredUsages.map((usage) => (
                    <tr key={usage.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5">
                        <div className="font-mono font-medium text-slate-900 dark:text-white">
                          #{usage.id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {usage.used_at ? new Date(usage.used_at).toLocaleString() : '—'}
                        </div>
                      </td>

                      <td className="py-2.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {usage.promo_code}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {usage.discount_percentage}% OFF
                          </span>
                        </div>
                        {usage.promo_name && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                            {usage.promo_name}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {usage.creator_name || 'Creator'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {usage.creator_email}
                        </div>
                        {usage.creator_phone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {usage.creator_phone}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5">
                        {usage.invoice_no ? (
                          <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                            {usage.invoice_no}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No invoice linked</span>
                        )}
                      </td>

                      <td className="py-2.5 font-mono">
                        {usage.payment_amount ? (
                          <span className="text-slate-900 dark:text-white font-medium">
                            {Number(usage.payment_amount).toFixed(2)} {usage.currency || 'BDT'}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{Number(usage.discount_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingPromo ? 'Edit Promo Campaign' : 'Create New Promo Code'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure discount percentages, usage caps, and activation rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePromo} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Promo Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPromo)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.01"
                    required
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Uses Per Creator
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.max_uses_per_creator}
                    onChange={(e) => setFormData({ ...formData, max_uses_per_creator: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Total Uses (Global)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_total_uses}
                    onChange={(e) => setFormData({ ...formData, max_total_uses: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ending Date (Expiration)
                  </label>
                  <input
                    type="date"
                    value={formData.ending_date}
                    onChange={(e) => setFormData({ ...formData, ending_date: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-800 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Public Visibility
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Feature this coupon code on the public homepage banner and marketing offers.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-800 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Active Campaign
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Enable this coupon code to be redeemed by creators during checkout.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingPromo ? 'Update Promo' : 'Create Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Confirm Delete Promo Code
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete the promo coupon{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                "{deleteConfirmModal.code}"
              </span>
              ? This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePromo}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

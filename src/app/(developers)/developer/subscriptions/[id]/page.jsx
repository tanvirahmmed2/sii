'use client';

import { useState, useEffect, useContext, use } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiCalendar,
  FiCreditCard,
  FiGlobe,
  FiUser,
  FiPackage,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiDollarSign,
  FiCheck,
  FiX,
  FiExternalLink,
  FiCopy,
  FiRepeat,
  FiLayers,
  FiEdit2,
  FiTrash2,
  FiShield,
  FiServer
} from 'react-icons/fi';

export default function SubscriptionDetailsPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const subId = routeParams?.id || (params ? (typeof params.then === 'function' ? use(params)?.id : params.id) : null);

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAuthorized = permissions.includes('subscriptions') || permissions.includes('creators');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'payments' | 'history'

  // Renewal Modal State
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalSubmitting, setRenewalSubmitting] = useState(false);
  const [linkingWebsite, setLinkingWebsite] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Renewal form state
  const [renewForm, setRenewForm] = useState({
    package_id: '',
    duration_type: 'monthly', // 'monthly', 'yearly', 'multiple_months', 'multiple_years', 'custom'
    duration_multiplier: 1,
    custom_period_end: '',
    extend_from: 'period_end', // 'period_end' or 'now'
    amount: '',
    currency: 'BDT',
    payment_status: 'PAID', // 'PAID' or 'UNPAID'
    payment_method: 'BKASH',
    transaction_id: '',
    notes: '',
  });

  // Existing website editing state
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteUpdating, setWebsiteUpdating] = useState(false);
  const [websiteForm, setWebsiteForm] = useState({
    name: '',
    subdomain: '',
    custom_domain: '',
    custom_domain_verified: false,
    status: 'published',
    institution_type: 'School',
    eiin_number: '',
    primary_color: '#1e40af',
    secondary_color: '#0ea5e9',
    is_maintenance_mode: false,
    maintenance_message: '',
  });

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchSubscription = async () => {
    if (!subId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/marketing/developer/subscriptions/${subId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Prepopulate renew form defaults from fetched subscription
        const subCurr = json.subscription?.payment_currency || (Number(json.subscription?.total_amount) > 500 ? 'BDT' : 'BDT');
        const defaultMeth = subCurr === 'BDT' ? 'BKASH' : 'PADDLE';
        setRenewForm((prev) => ({
          ...prev,
          package_id: json.subscription?.package_id || '',
          currency: subCurr,
          payment_method: defaultMeth,
          amount: json.subscription?.total_amount || (subCurr === 'BDT' ? json.package?.monthly_price_bdt : json.package?.monthly_price_usd) || '',
          notes: `Subscription renewal for ${json.package?.name || 'Package'}`,
        }));
        if (json.website) {
          setWebsiteForm({
            name: json.website.name || '',
            subdomain: json.website.subdomain || '',
            custom_domain: json.website.custom_domain || '',
            custom_domain_verified: Boolean(json.website.custom_domain_verified),
            status: json.website.status || 'published',
            institution_type: json.website.institution_type || 'School',
            eiin_number: json.website.eiin_number || '',
            primary_color: json.website.primary_color || '#1e40af',
            secondary_color: json.website.secondary_color || '#0ea5e9',
            is_maintenance_mode: Boolean(json.website.is_maintenance_mode),
            maintenance_message: json.website.maintenance_message || '',
          });
        }
      } else {
        setError(json.error || 'Subscription not found');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!isAuthorized || !subId) return;

    fetch(`/api/marketing/developer/subscriptions/${subId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success) {
            setData(json);
            const subCurr = json.subscription?.payment_currency || (Number(json.subscription?.total_amount) > 500 ? 'BDT' : 'BDT');
            const defaultMeth = subCurr === 'BDT' ? 'BKASH' : 'PADDLE';
            setRenewForm((prev) => ({
              ...prev,
              package_id: json.subscription?.package_id || '',
              currency: subCurr,
              payment_method: defaultMeth,
              amount: json.subscription?.total_amount || (subCurr === 'BDT' ? json.package?.monthly_price_bdt : json.package?.monthly_price_usd) || '',
              notes: `Subscription renewal for ${json.package?.name || 'Package'}`,
            }));
            if (json.website) {
              setWebsiteForm({
                name: json.website.name || '',
                subdomain: json.website.subdomain || '',
                custom_domain: json.website.custom_domain || '',
                custom_domain_verified: Boolean(json.website.custom_domain_verified),
                status: json.website.status || 'published',
                institution_type: json.website.institution_type || 'School',
                eiin_number: json.website.eiin_number || '',
                is_maintenance_mode: Boolean(json.website.is_maintenance_mode),
                maintenance_message: json.website.maintenance_message || '',
              });
            }
          } else {
            setError(json.error || 'Subscription not found');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error(err);
          setError('Network error loading subscription details');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isAuthorized, subId]);

  // Handle renewal form submission
  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setRenewalSubmitting(true);
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions/${subId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'renew',
          package_id: Number(renewForm.package_id) || Number(data.subscription?.package_id),
          duration_type: renewForm.duration_type,
          duration_multiplier: Number(renewForm.duration_multiplier) || 1,
          custom_period_end: renewForm.custom_period_end || undefined,
          extend_from: renewForm.extend_from,
          amount: renewForm.amount ? Number(renewForm.amount) : undefined,
          currency: renewForm.currency,
          payment_status: renewForm.payment_status,
          payment_method: renewForm.payment_method,
          transaction_id: renewForm.transaction_id || undefined,
          notes: renewForm.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(json.message || 'Subscription renewed successfully!', 'success');
        setRenewalModalOpen(false);
        fetchSubscription();
      } else {
        showFeedback(json.error || 'Failed to renew subscription', 'error');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Network error while processing renewal', 'error');
    } finally {
      setRenewalSubmitting(false);
    }
  };

  // Handle updating existing website information
  const handleUpdateWebsite = async (e) => {
    e.preventDefault();
    const targetWebsiteId = data?.website?.id || data?.subscription?.website_id;
    if (!targetWebsiteId) return;
    setWebsiteUpdating(true);
    try {
      const res = await fetch(`/api/marketing/developer/websites/${targetWebsiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: websiteForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback('Website information updated successfully!', 'success');
        setEditingWebsite(false);
        fetchSubscription();
      } else {
        showFeedback(json.error || 'Failed to update website', 'error');
      }
    } catch {
      showFeedback('Network error updating website', 'error');
    } finally {
      setWebsiteUpdating(false);
    }
  };

  // Handle linking or unlinking website container
  const handleLinkWebsite = async (selectedWebId) => {
    setLinkingWebsite(true);
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            website_id: selectedWebId ? Number(selectedWebId) : null,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(selectedWebId ? 'Website container linked successfully!' : 'Website unlinked from subscription.', 'success');
        fetchSubscription();
      } else {
        showFeedback(json.error || 'Failed to update linked website', 'error');
      }
    } catch {
      showFeedback('Network error linking website', 'error');
    } finally {
      setLinkingWebsite(false);
    }
  };

  // Quick Action: Update Status (e.g. active, cancelled, past_due)
  const handleUpdateStatus = async (newStatus) => {
    if (!confirm(`Are you sure you want to change subscription status to "${newStatus}"?`)) return;
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions/${subId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(`Subscription status updated to "${newStatus}"`, 'success');
        fetchSubscription();
      } else {
        showFeedback(json.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showFeedback('Network error updating status', 'error');
    }
  };

  // Quick Action: Settle Pending Payment / Invoice
  const handleSettlePayment = async (paymentId) => {
    if (!confirm('Mark this pending payment as PAID and activate the subscription term?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions/${subId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settle_payment',
          payment_id: paymentId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(json.message || 'Payment marked as PAID successfully!', 'success');
        fetchSubscription();
      } else {
        showFeedback(json.error || 'Failed to settle payment', 'error');
      }
    } catch {
      showFeedback('Network error settling payment', 'error');
    }
  };

  // Quick Action: Toggle Auto-Renew
  const handleToggleAutoRenew = async () => {
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions/${subId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_cancel' }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback('Auto-renewal preference toggled', 'success');
        fetchSubscription();
      } else {
        showFeedback(json.error || 'Failed to update auto-renewal', 'error');
      }
    } catch (err) {
      showFeedback('Network error updating auto-renewal', 'error');
    }
  };

  // Calculate renewal preview dates
  const calculateRenewalPreview = () => {
    const pkg = data?.available_packages?.find((p) => p.id === Number(renewForm.package_id)) || data?.package;
    const now = new Date();
    let start = new Date();
    const curEnd = data?.subscription?.current_period_end || data?.subscription?.purchase_period_end;

    if (renewForm.extend_from === 'period_end' && curEnd && new Date(curEnd) > now) {
      start = new Date(curEnd);
    }

    let end = new Date(start);
    const multiplier = Math.max(1, Number(renewForm.duration_multiplier) || 1);

    if (renewForm.duration_type === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else if (renewForm.duration_type === 'multiple_years') {
      end.setFullYear(end.getFullYear() + multiplier);
    } else if (renewForm.duration_type === 'multiple_months') {
      end.setMonth(end.getMonth() + multiplier);
    } else if (renewForm.duration_type === 'custom' && renewForm.custom_period_end) {
      end = new Date(renewForm.custom_period_end);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    // Default amount calculation
    let calculatedCost = 0;
    const isYearly = renewForm.duration_type === 'yearly' || renewForm.duration_type === 'multiple_years';
    const yearCount = renewForm.duration_type === 'multiple_years' ? multiplier : 1;
    const monthCount = renewForm.duration_type === 'multiple_months' ? multiplier : 1;

    if (pkg) {
      if (renewForm.currency === 'BDT') {
        calculatedCost = isYearly
          ? Number(pkg.yearly_price_bdt || 0) * yearCount
          : Number(pkg.monthly_price_bdt || 0) * monthCount;
      } else {
        calculatedCost = isYearly
          ? Number(pkg.yearly_price_usd || 0) * yearCount
          : Number(pkg.monthly_price_usd || 0) * monthCount;
      }
    }

    return {
      startDate: start.toLocaleDateString(),
      endDate: end.toLocaleDateString(),
      estimatedCost: calculatedCost.toFixed(2),
    };
  };

  if (!isAuthorized && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiShield />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">You require subscriptions management permissions to view this resource.</p>
          <Link
            href="/developer/subscriptions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Subscriptions
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24">
        <LoadingScreen fullScreen={false} size="sm" label="Loading subscription details..." />
      </div>
    );
  }

  if (error || !data?.subscription) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-12">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiAlertCircle />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Subscription Not Found</h3>
            <p className="text-xs text-slate-500 mt-1">{error || `No record found matching identifier #${subId}`}</p>
          </div>
          <Link
            href="/developer/subscriptions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
          >
            <FiArrowLeft /> Back to Subscriptions Directory
          </Link>
        </div>
      </div>
    );
  }

  const { subscription, creator, package: pkg, website, payments = [], purchases = [] } = data;
  const isPaid = subscription.payment_status === 'successful' || subscription.purchase_status === 'completed';
  const isActive = subscription.status === 'active';
  const preview = calculateRenewalPreview();

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/developer/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft className="text-sm" /> Back to Subscriptions Ledger
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSubscription}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <FiRefreshCw className="text-xs" /> Refresh
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded text-xs font-medium border flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <FiX />
          </button>
        </div>
      )}

      {/* Header Inspection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                Subscription #{subscription.id}
              </span>
              {subscription.purchase_code && (
                <span className="font-mono text-[11px] text-slate-500">
                  Ref: {subscription.purchase_code}
                </span>
              )}
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                    : subscription.status === 'past_due'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {subscription.status || 'Active'}
              </span>

              {/* Payment Status Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                }`}
              >
                {isPaid ? `Paid • ${subscription.payment_method || 'Grant'}` : 'Unpaid Invoice'}
              </span>
            </div>

            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {pkg?.name || 'Educational Plan'} &bull; {creator?.name || 'Creator Account'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Institution: <span className="font-medium text-slate-700 dark:text-slate-300">{creator?.institution || 'Unassigned'}</span> &bull; Client: {creator?.email}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRenewalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <FiRepeat className="text-sm" /> Renew Subscription
            </button>

            {isActive ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('cancelled')}
                className="px-3 py-2 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel Plan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdateStatus('active')}
                className="px-3 py-2 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium cursor-pointer transition-colors"
              >
                Mark Active
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleAutoRenew}
              className={`px-3 py-2 rounded border text-xs font-medium cursor-pointer transition-colors ${
                subscription.cancel_at_period_end
                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              {subscription.cancel_at_period_end ? 'Enable Auto-Renew' : 'Disable Auto-Renew'}
            </button>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Billing Interval</span>
            <div className="text-xs font-semibold text-slate-900 dark:text-white capitalize flex items-center gap-1.5">
              <FiRepeat className="text-slate-400" />
              {subscription.billing_cycle || 'Monthly'}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Amount / Cost</span>
            <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FiDollarSign className="text-slate-400" />
              {subscription.payment_currency === 'BDT' ? '৳' : '$'}
              {Number(subscription.total_amount || subscription.payment_amount || pkg?.monthly_price_usd || 0).toFixed(2)}
              <span className="text-[10px] font-normal text-slate-400">({subscription.payment_currency || 'USD'})</span>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Validity Range</span>
            <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : '—'}
              {' → '}
              {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Time Remaining</span>
            <div
              className={`text-xs font-semibold ${
                subscription.days_remaining <= 0
                  ? 'text-rose-600'
                  : subscription.days_remaining < 7
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {subscription.days_remaining > 0
                ? `${subscription.days_remaining} Days Remaining`
                : subscription.days_remaining === 0
                ? 'Expires Today'
                : `Expired (${Math.abs(subscription.days_remaining)} days ago)`}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'overview'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Overview &amp; Containers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'payments'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Payment Ledger ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'history'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Purchases History ({purchases.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CONTAINERS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1 & 2: Package & Website details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Package Specifications Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm font-semibold">
                    <FiPackage />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Package Plan Tier</h3>
                    <p className="text-[11px] text-slate-400">Configuration quotas and limits assigned by this tier</p>
                  </div>
                </div>
                <Link
                  href={`/developer/packages/${pkg?.slug || ''}`}
                  className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 font-medium"
                >
                  Manage Package <FiExternalLink />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Plan Name</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{pkg?.name || 'N/A'}</div>
                    {pkg?.tagline && <p className="text-xs text-slate-500">{pkg.tagline}</p>}
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Standard Pricing Rates</span>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono space-y-0.5 mt-0.5">
                      <div>USD: ${Number(pkg?.monthly_price_usd || 0).toFixed(2)}/mo &bull; ${Number(pkg?.yearly_price_usd || 0).toFixed(2)}/yr</div>
                      <div>BDT: ৳{Number(pkg?.monthly_price_bdt || 0).toFixed(2)}/mo &bull; ৳{Number(pkg?.yearly_price_bdt || 0).toFixed(2)}/yr</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Quotas &amp; Allocation</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Max Students:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{pkg?.max_students ?? '500'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Max Teachers:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{pkg?.max_teachers ?? '30'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Max Staff:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{pkg?.max_staff ?? '20'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Storage MB:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{pkg?.max_storage_mb ?? '5120'} MB</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Features List */}
              {Array.isArray(pkg?.features) && pkg.features.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Included Features</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pkg.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <FiCheck className="text-emerald-500 text-xs shrink-0" />
                        <span>{typeof feat === 'string' ? feat : feat?.name || JSON.stringify(feat)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Linked Website Container Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm font-semibold">
                    <FiGlobe />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Hosted Website Container</h3>
                    <p className="text-[11px] text-slate-400">View and update existing website configuration for this subscription</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    disabled={linkingWebsite}
                    value={website?.id || ''}
                    onChange={(e) => handleLinkWebsite(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="">{website ? '-- Detach Container --' : '-- Attach an Existing Website --'}</option>
                    {data?.creator_websites?.map((w) => (
                      <option key={w.id} value={w.id}>
                        Site #{w.id}: {w.name} ({w.subdomain})
                      </option>
                    ))}
                  </select>
                  {website && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingWebsite(!editingWebsite)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FiEdit2 className="text-xs" />
                        <span>{editingWebsite ? 'Cancel' : 'Edit Website Info'}</span>
                      </button>
                      <Link
                        href={`/developer/websites/${website.id}`}
                        className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 font-medium"
                      >
                        Inspect <FiExternalLink />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {website ? (
                editingWebsite ? (
                  /* Form to Update Existing Website Info */
                  <form onSubmit={handleUpdateWebsite} className="space-y-3.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Website Name
                        </label>
                        <input
                          type="text"
                          required
                          value={websiteForm.name}
                          onChange={(e) => setWebsiteForm({ ...websiteForm, name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Subdomain
                        </label>
                        <div className="flex items-center">
                          <input
                            type="text"
                            required
                            value={websiteForm.subdomain}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                          />
                          <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-r text-[11px] text-slate-500 font-mono">
                            .educraft.io
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Custom Domain
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. campus.edu.bd"
                          value={websiteForm.custom_domain}
                          onChange={(e) => setWebsiteForm({ ...websiteForm, custom_domain: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Institution Type
                        </label>
                        <select
                          value={websiteForm.institution_type}
                          onChange={(e) => setWebsiteForm({ ...websiteForm, institution_type: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="School">School</option>
                          <option value="College">College</option>
                          <option value="University">University</option>
                          <option value="Madrasa">Madrasa</option>
                          <option value="Training Center">Training Center</option>
                          <option value="Academy">Academy</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Status
                        </label>
                        <select
                          value={websiteForm.status}
                          onChange={(e) => setWebsiteForm({ ...websiteForm, status: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="published">Published (Live)</option>
                          <option value="draft">Draft (Private)</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Primary Color
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={websiteForm.primary_color || '#1e40af'}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, primary_color: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={websiteForm.primary_color}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, primary_color: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Secondary Color
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={websiteForm.secondary_color || '#0ea5e9'}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, secondary_color: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={websiteForm.secondary_color}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, secondary_color: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="flex items-center gap-4 pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={websiteForm.custom_domain_verified}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, custom_domain_verified: e.target.checked })}
                            className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-0"
                          />
                          <span>Domain Verified</span>
                        </label>

                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={websiteForm.is_maintenance_mode}
                            onChange={(e) => setWebsiteForm({ ...websiteForm, is_maintenance_mode: e.target.checked })}
                            className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-0"
                          />
                          <span>Maintenance Mode</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingWebsite(false)}
                          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={websiteUpdating}
                          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          {websiteUpdating ? (
                            <>
                              <FiRefreshCw className="animate-spin text-xs" /> Saving...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle className="text-xs" /> Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Read-Only View of Existing Website Info */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Website Name</span>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{website.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{website.institution_type || 'School'}</div>
                      </div>

                      <div className="p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Subdomain</span>
                        <div className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                          {website.subdomain}.educraft.io
                        </div>
                      </div>

                      <div className="p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Custom Domain</span>
                        <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                          {website.custom_domain || 'None configured'}
                        </div>
                        {website.custom_domain_verified && (
                          <span className="text-[9px] text-emerald-600 font-semibold">&bull; Verified</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>Status: <strong className="capitalize text-slate-700 dark:text-slate-300">{website.status || 'published'}</strong></span>
                        <span>Mode: <strong className={website.is_maintenance_mode ? 'text-amber-600' : 'text-emerald-600'}>{website.is_maintenance_mode ? 'Maintenance' : 'Active'}</strong></span>
                        <span>Storage Consumed: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{website.storage_used_mb ?? 0} MB</span></span>
                        <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-700">
                          <span className="text-[11px] text-slate-400">Brand:</span>
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-xs inline-block"
                            style={{ backgroundColor: website.primary_color || '#1e40af' }}
                            title={`Primary: ${website.primary_color || '#1e40af'}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-xs inline-block"
                            style={{ backgroundColor: website.secondary_color || '#0ea5e9' }}
                            title={`Secondary: ${website.secondary_color || '#0ea5e9'}`}
                          />
                        </div>
                      </div>
                      <div>
                        Website Expiration: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{website.subscription_expires_at ? new Date(website.subscription_expires_at).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs space-y-3">
                  <p>No specific website container is linked directly to this subscription record.</p>
                  {data?.creator_websites?.length > 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[11px] text-slate-500">Attach one of this creator&apos;s existing websites:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {data.creator_websites.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => handleLinkWebsite(w.id)}
                            disabled={linkingWebsite}
                            className="px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-mono cursor-pointer transition-colors"
                          >
                            + Attach Site #{w.id} ({w.name})
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">This creator does not have any existing websites.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Creator Profile & Contract Meta */}
          <div className="space-y-5">
            {/* Creator Profile Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm font-semibold">
                    <FiUser />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Client / Creator</h3>
                    <p className="text-[11px] text-slate-400">Account billing holder</p>
                  </div>
                </div>
                <Link
                  href={`/developer/creators/${creator?.id}`}
                  className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 font-medium"
                >
                  Profile <FiExternalLink />
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Name</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{creator?.name}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Email Address</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>{creator?.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(creator?.email, 'creator_email')}
                      className="cursor-pointer opacity-60 hover:opacity-100"
                    >
                      <FiCopy className="text-[10px]" />
                    </button>
                    {copiedKey === 'creator_email' && <span className="text-[9px] text-emerald-600">Copied</span>}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Phone</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">{creator?.phone || 'Not provided'}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Institution / Organization</span>
                  <div className="text-slate-700 dark:text-slate-300">{creator?.institution || 'Unassigned'}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Location</span>
                  <div className="text-slate-700 dark:text-slate-300">
                    {[creator?.city, creator?.country].filter(Boolean).join(', ') || 'Global'}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Account Status:</span>
                  <span className={`font-semibold ${creator?.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {creator?.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Developer Controls</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setRenewalModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between"
                >
                  <span>Renew Subscription</span>
                  <FiRepeat />
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('past_due')}
                  className="w-full text-left px-3 py-2 rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between"
                >
                  <span>Mark as Past Due / Awaiting Payment</span>
                  <FiClock />
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('expired')}
                  className="w-full text-left px-3 py-2 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between"
                >
                  <span>Force Mark Expired</span>
                  <FiAlertCircle />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Transaction &amp; Payment Ledger</h3>
              <p className="text-[11px] text-slate-400">All recorded payments tied to this subscription or client</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Payment ID</th>
                  <th className="pb-2">Txn Reference</th>
                  <th className="pb-2">Method &amp; Gateway</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Payment Date</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No payment transactions recorded for this subscription.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono font-medium text-slate-400">#{p.id}</td>
                      <td className="py-2.5 font-mono text-[11px] font-medium text-slate-900 dark:text-white">
                        {p.transaction_id || '—'}
                      </td>
                      <td className="py-2.5 capitalize">
                        {p.payment_method || 'Direct'}
                        {p.payment_gateway && <span className="text-[10px] text-slate-400 ml-1">({p.payment_gateway})</span>}
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                        {p.currency === 'BDT' ? '৳' : '$'}{Number(p.amount || 0).toFixed(2)} {p.currency}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${
                            p.status === 'successful' || p.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                        {p.payment_date ? new Date(p.payment_date).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {(p.status === 'pending' || !p.status) && (
                          <button
                            type="button"
                            onClick={() => handleSettlePayment(p.id)}
                            className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold cursor-pointer transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASES HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Purchase &amp; Invoice History</h3>
              <p className="text-[11px] text-slate-400">Orders placed by this client account</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Purchase Code</th>
                  <th className="pb-2">Package Plan</th>
                  <th className="pb-2">Billing Term</th>
                  <th className="pb-2">Total Amount</th>
                  <th className="pb-2">Order Status</th>
                  <th className="pb-2">Period Dates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No prior purchase records found.
                    </td>
                  </tr>
                ) : (
                  purchases.map((pu) => (
                    <tr key={pu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono font-medium text-slate-400">#{pu.id}</td>
                      <td className="py-2.5 font-mono text-[11px] font-medium text-slate-900 dark:text-white">
                        {pu.purchase_code}
                      </td>
                      <td className="py-2.5 font-medium">{pu.package_name || `Package #${pu.package_id}`}</td>
                      <td className="py-2.5 capitalize">{pu.billing_cycle || 'Monthly'}</td>
                      <td className="py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                        ${Number(pu.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${
                            pu.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {pu.status}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        {pu.period_start ? new Date(pu.period_start).toLocaleDateString() : '—'}
                        {' → '}
                        {pu.period_end ? new Date(pu.period_end).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RENEWAL MODAL (HANDLES PAYMENT TO PURCHASE RENEW) */}
      {/* ========================================================================= */}
      {renewalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiRepeat className="text-emerald-600" /> Renew Subscription Plan
                </h3>
                <p className="text-xs text-slate-500">
                  Process renewal order and handle payment transaction for client &ldquo;{creator?.name}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenewalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              {/* Package Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Package Plan
                </label>
                <select
                  value={renewForm.package_id}
                  onChange={(e) => {
                    const nextPkgId = e.target.value;
                    setRenewForm((prev) => {
                      const pkg = data?.available_packages?.find((p) => p.id === Number(nextPkgId));
                      let nextAmount = prev.amount;
                      if (pkg) {
                        const isYearly = prev.duration_type === 'yearly' || prev.duration_type === 'multiple_years';
                        const count = isYearly
                          ? (prev.duration_type === 'multiple_years' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1)
                          : (prev.duration_type === 'multiple_months' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1);
                        nextAmount = prev.currency === 'BDT'
                          ? (isYearly ? Number(pkg.yearly_price_bdt || 0) : Number(pkg.monthly_price_bdt || 0)) * count
                          : (isYearly ? Number(pkg.yearly_price_usd || 0) : Number(pkg.monthly_price_usd || 0)) * count;
                      }
                      return {
                        ...prev,
                        package_id: nextPkgId,
                        amount: nextAmount ? String(nextAmount) : prev.amount,
                        notes: pkg ? `Subscription renewal for ${pkg.name}` : prev.notes,
                      };
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 font-medium"
                >
                  {data?.available_packages?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.monthly_price_usd}/mo (${p.yearly_price_usd}/yr) | ৳{p.monthly_price_bdt}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Renewal Duration & Term */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Duration Cycle
                  </label>
                  <select
                    value={renewForm.duration_type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setRenewForm((prev) => {
                        const pkg = data?.available_packages?.find((p) => p.id === Number(prev.package_id)) || data?.package;
                        let nextAmount = prev.amount;
                        if (pkg && nextType !== 'custom') {
                          const isYearly = nextType === 'yearly' || nextType === 'multiple_years';
                          const count = isYearly
                            ? (nextType === 'multiple_years' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1)
                            : (nextType === 'multiple_months' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1);
                          nextAmount = prev.currency === 'BDT'
                            ? (isYearly ? Number(pkg.yearly_price_bdt || 0) : Number(pkg.monthly_price_bdt || 0)) * count
                            : (isYearly ? Number(pkg.yearly_price_usd || 0) : Number(pkg.monthly_price_usd || 0)) * count;
                        }
                        return {
                          ...prev,
                          duration_type: nextType,
                          amount: nextAmount ? String(nextAmount) : prev.amount,
                        };
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                  >
                    <option value="monthly">Monthly (1 Month)</option>
                    <option value="yearly">Yearly (1 Year)</option>
                    <option value="multiple_months">Multiple Months</option>
                    <option value="multiple_years">Multiple Years</option>
                    <option value="custom">Custom End Date</option>
                  </select>
                </div>

                {renewForm.duration_type.startsWith('multiple') ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Multiplier (Count)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={renewForm.duration_multiplier}
                      onChange={(e) => {
                        const nextCount = Math.max(1, Number(e.target.value) || 1);
                        setRenewForm((prev) => {
                          const pkg = data?.available_packages?.find((p) => p.id === Number(prev.package_id)) || data?.package;
                          let nextAmount = prev.amount;
                          if (pkg) {
                            const isYearly = prev.duration_type === 'yearly' || prev.duration_type === 'multiple_years';
                            nextAmount = prev.currency === 'BDT'
                              ? (isYearly ? Number(pkg.yearly_price_bdt || 0) : Number(pkg.monthly_price_bdt || 0)) * nextCount
                              : (isYearly ? Number(pkg.yearly_price_usd || 0) : Number(pkg.monthly_price_usd || 0)) * nextCount;
                          }
                          return {
                            ...prev,
                            duration_multiplier: e.target.value,
                            amount: nextAmount ? String(nextAmount) : prev.amount,
                          };
                        });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                ) : renewForm.duration_type === 'custom' ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Custom Expiration Date
                    </label>
                    <input
                      type="date"
                      required
                      value={renewForm.custom_period_end}
                      onChange={(e) => setRenewForm({ ...renewForm, custom_period_end: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Renewal Start Point
                    </label>
                    <select
                      value={renewForm.extend_from}
                      onChange={(e) => setRenewForm({ ...renewForm, extend_from: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="period_end">Extend after Current Period End</option>
                      <option value="now">Start from Today Immediately</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Handling Options */}
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                  Payment Processing &amp; Settlement
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Payment Status
                    </label>
                    <select
                      value={renewForm.payment_status}
                      onChange={(e) => setRenewForm({ ...renewForm, payment_status: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none"
                    >
                      <option value="PAID">PAID (Record payment &amp; Activate immediately)</option>
                      <option value="UNPAID">UNPAID (Issue pending invoice to client)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Payment Method
                    </label>
                    <select
                      value={renewForm.payment_method}
                      onChange={(e) => {
                        const nextMethod = e.target.value;
                        const nextCurrency = nextMethod === 'BKASH' ? 'BDT' : 'USD';
                        setRenewForm((prev) => {
                          const pkg = data?.available_packages?.find((p) => p.id === Number(prev.package_id)) || data?.package;
                          let nextAmount = prev.amount;
                          if (pkg) {
                            const isYearly = prev.duration_type === 'yearly' || prev.duration_type === 'multiple_years';
                            const count = isYearly
                              ? (prev.duration_type === 'multiple_years' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1)
                              : (prev.duration_type === 'multiple_months' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1);
                            nextAmount = nextCurrency === 'BDT'
                              ? (isYearly ? Number(pkg.yearly_price_bdt || 0) : Number(pkg.monthly_price_bdt || 0)) * count
                              : (isYearly ? Number(pkg.yearly_price_usd || 0) : Number(pkg.monthly_price_usd || 0)) * count;
                          }
                          return {
                            ...prev,
                            payment_method: nextMethod,
                            currency: nextCurrency,
                            amount: nextAmount ? String(nextAmount) : prev.amount,
                          };
                        });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="BKASH">bKash (BDT)</option>
                      <option value="PADDLE">Paddle (USD)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Currency</label>
                    <select
                      value={renewForm.currency}
                      onChange={(e) => {
                        const nextCurr = e.target.value;
                        const nextMethod = nextCurr === 'BDT' ? 'BKASH' : 'PADDLE';
                        setRenewForm((prev) => {
                          const pkg = data?.available_packages?.find((p) => p.id === Number(prev.package_id)) || data?.package;
                          let nextAmount = prev.amount;
                          if (pkg) {
                            const isYearly = prev.duration_type === 'yearly' || prev.duration_type === 'multiple_years';
                            const count = isYearly
                              ? (prev.duration_type === 'multiple_years' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1)
                              : (prev.duration_type === 'multiple_months' ? Math.max(1, Number(prev.duration_multiplier) || 1) : 1);
                            if (nextCurr === 'BDT') {
                              nextAmount = (isYearly ? Number(pkg.yearly_price_bdt || 0) : Number(pkg.monthly_price_bdt || 0)) * count;
                            } else {
                              nextAmount = (isYearly ? Number(pkg.yearly_price_usd || 0) : Number(pkg.monthly_price_usd || 0)) * count;
                            }
                          }
                          return {
                            ...prev,
                            currency: nextCurr,
                            payment_method: nextMethod,
                            amount: nextAmount ? String(nextAmount) : prev.amount,
                          };
                        });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    >
                      <option value="BDT">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Amount (Override or auto)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`Est: ${preview.estimatedCost}`}
                      value={renewForm.amount}
                      onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Transaction / Ref ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TXN9872134 (or auto)"
                      value={renewForm.transaction_id}
                      onChange={(e) => setRenewForm({ ...renewForm, transaction_id: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Renewal Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Renewal Order Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual renewal granted with 10% educational loyalty grant"
                  value={renewForm.notes}
                  onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Calculated Real-time Preview Banner */}
              <div className="p-3.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span>Calculated Term Preview:</span>
                  <span className="font-mono">
                    {renewForm.currency === 'BDT' ? '৳' : '$'}
                    {renewForm.amount ? Number(renewForm.amount).toFixed(2) : preview.estimatedCost}{' '}
                    {renewForm.currency}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                  New Active Period: {preview.startDate} &rarr; {preview.endDate}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRenewalModalOpen(false)}
                  className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewalSubmitting}
                  className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {renewalSubmitting ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Processing Renewal...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle /> Confirm &amp; Apply Renewal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

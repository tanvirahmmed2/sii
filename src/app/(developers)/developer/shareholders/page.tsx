'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiAward,
  BiPlus,
  BiRefresh,
  BiCheckCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiTrendingUp,
  BiTrendingDown,
  BiDollarCircle,
  BiMoneyWithdraw,
  BiPieChartAlt2,
  BiEdit,
  BiTrash,
  BiSearch,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

interface Shareholder {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  developer_id?: number | null;
  role_title?: string | null;
  share_percentage: number;
  total_shares: number;
  payout_method: string;
  account_details: any;
  total_invested?: number;
  total_withdrawn: number;
  share_of_net_profit: number;
  eligible_dividend: number;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
}

export default function ShareholdersPage() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalShareholders: 0,
    activeShareholders: 0,
    totalAllocatedPercentage: 0,
    unallocatedPercentage: 100,
    totalSharesAllocated: 0,
    totalDividendsDisbursed: 0,
    netProfit: 0,
    totalInflow: 0,
    totalOutflow: 0,
    currency: 'BDT',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showFormPanel, setShowFormPanel] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);

  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formRoleTitle, setFormRoleTitle] = useState<string>('');
  const [formSharePercentage, setFormSharePercentage] = useState<string>('');
  const [formTotalShares, setFormTotalShares] = useState<string>('');
  const [formPayoutMethod, setFormPayoutMethod] = useState<string>('bank_transfer');
  const [formBankName, setFormBankName] = useState<string>('');
  const [formAccountNumber, setFormAccountNumber] = useState<string>('');
  const [formAccountHolder, setFormAccountHolder] = useState<string>('');
  const [formBranch, setFormBranch] = useState<string>('');
  const [formRoutingNumber, setFormRoutingNumber] = useState<string>('');
  const [formMfsNumber, setFormMfsNumber] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const [dividendTarget, setDividendTarget] = useState<Shareholder | null>(null);
  const [dividendAmount, setDividendAmount] = useState<string>('');
  const [dividendNotes, setDividendNotes] = useState<string>('');
  const [payingDividend, setPayingDividend] = useState<boolean>(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchShareholdersData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/shareholders?currency=BDT');
      const data = await res.json();
      if (data.success) {
        setShareholders(data.shareholders || []);
        setRecentWithdrawals(data.recentWithdrawals || []);
        if (data.stats) setStats(data.stats);
      } else {
        setErrorMessage(data.error || 'Failed to fetch shareholders data.');
      }
    } catch {
      setErrorMessage('Network error loading shareholders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShareholdersData();
  }, []);

  const openCreatePanel = () => {
    setDividendTarget(null);
    setEditingShareholder(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRoleTitle('Partner & Shareholder');
    setFormSharePercentage('');
    setFormTotalShares('1000');
    setFormPayoutMethod('bank_transfer');
    setFormBankName('');
    setFormAccountNumber('');
    setFormAccountHolder('');
    setFormBranch('');
    setFormRoutingNumber('');
    setFormMfsNumber('');
    setFormNotes('');
    setFormIsActive(true);
    setShowFormPanel(true);
  };

  const openEditPanel = (s: Shareholder) => {
    setDividendTarget(null);
    setEditingShareholder(s);
    setFormName(s.name || '');
    setFormEmail(s.email || '');
    setFormPhone(s.phone || '');
    setFormRoleTitle(s.role_title || 'Shareholder');
    setFormSharePercentage(String(s.share_percentage || 0));
    setFormTotalShares(String(s.total_shares || 0));
    setFormPayoutMethod(s.payout_method || 'bank_transfer');

    const details = typeof s.account_details === 'string'
      ? (JSON.parse(s.account_details || '{}') || {})
      : (s.account_details || {});

    setFormBankName(details.bank_name || '');
    setFormAccountNumber(details.account_number || '');
    setFormAccountHolder(details.account_holder || '');
    setFormBranch(details.branch || '');
    setFormRoutingNumber(details.routing_number || '');
    setFormMfsNumber(details.phone || details.mfs_number || '');
    setFormNotes(s.notes || '');
    setFormIsActive(s.is_active);
    setShowFormPanel(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveShareholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setErrorMessage('Name and email are required.');
      return;
    }

    const pct = parseFloat(formSharePercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setErrorMessage('Share percentage must be between 0 and 100.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const accountDetails = {
      bank_name: formBankName,
      account_number: formAccountNumber,
      account_holder: formAccountHolder,
      branch: formBranch,
      routing_number: formRoutingNumber,
      phone: formMfsNumber,
    };

    try {
      const url = '/api/marketing/developer/shareholders';
      const method = editingShareholder ? 'PUT' : 'POST';
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        role_title: formRoleTitle.trim(),
        share_percentage: pct,
        total_shares: parseInt(formTotalShares || '0', 10),
        payout_method: formPayoutMethod,
        account_details: accountDetails,
        notes: formNotes.trim(),
        is_active: formIsActive,
      };

      if (editingShareholder) {
        payload.id = editingShareholder.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(
          editingShareholder
            ? `Shareholder ${formName} updated successfully.`
            : `Shareholder ${formName} added with ${pct}% equity.`
        );
        setShowFormPanel(false);
        fetchShareholdersData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to save shareholder.');
      }
    } catch {
      setErrorMessage('Network error saving shareholder.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDividendPanel = (s: Shareholder) => {
    setShowFormPanel(false);
    setDividendTarget(s);
    setDividendAmount(s.eligible_dividend > 0 ? String(Math.floor(s.eligible_dividend)) : '');
    setDividendNotes(`Shareholder dividend distribution to ${s.name} (${s.share_percentage}% equity)`);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDisburseDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendTarget) return;

    const amt = parseFloat(dividendAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please specify a positive dividend amount.');
      return;
    }

    setPayingDividend(true);
    setErrorMessage('');

    try {
      const details = typeof dividendTarget.account_details === 'string'
        ? (JSON.parse(dividendTarget.account_details || '{}') || {})
        : (dividendTarget.account_details || {});

      const res = await fetch('/api/marketing/developer/withdraws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          currency: 'BDT',
          method: dividendTarget.payout_method || 'bank_transfer',
          notes: dividendNotes,
          withdraw_type: 'dividend',
          shareholder_id: dividendTarget.id,
          account_details: details,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Dividend withdrawal request for ৳${amt.toLocaleString()} recorded for ${dividendTarget.name}.`);
        setDividendTarget(null);
        fetchShareholdersData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to record dividend distribution.');
      }
    } catch {
      setErrorMessage('Network error recording dividend.');
    } finally {
      setPayingDividend(false);
    }
  };

  const handleDeleteShareholder = async (target: Shareholder) => {
    setDeleting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/marketing/developer/shareholders?id=${target.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Shareholder ${target.name} removed successfully.`);
        setConfirmDeleteId(null);
        fetchShareholdersData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to delete shareholder.');
      }
    } catch {
      setErrorMessage('Network error deleting shareholder.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredShareholders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return shareholders.filter((s) => {
      if (statusFilter === 'ACTIVE' && !s.is_active) return false;
      if (statusFilter === 'INACTIVE' && s.is_active) return false;
      if (!term) return true;
      return (
        (s.name || '').toLowerCase().includes(term) ||
        (s.email || '').toLowerCase().includes(term) ||
        (s.role_title || '').toLowerCase().includes(term) ||
        (s.phone || '').toLowerCase().includes(term) ||
        (s.payout_method || '').toLowerCase().includes(term)
      );
    });
  }, [shareholders, searchTerm, statusFilter]);

  return (
    <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
      {toastMessage && (
        <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-sm" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiInfoCircle className="text-sm" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage('')} className="hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
            Shareholders &amp; Equity
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Manage cap table equity distribution, dividend entitlements, and linked withdrawal channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchShareholdersData}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-sm" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => (showFormPanel ? setShowFormPanel(false) : openCreatePanel())}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            <BiPlus className="text-sm" />
            <span>{showFormPanel ? 'Close Form' : 'New Shareholder'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link href="/developer/shareholders" className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          Shareholders
        </Link>
        <Link href="/developer/investments" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Investments
        </Link>
        <Link href="/developer/expenses" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Expenses
        </Link>
        <Link href="/developer/monthly-accounting" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Accounting
        </Link>
        <Link href="/developer/withdraws" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Withdrawals
        </Link>
        <Link href="/developer/cashflow" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Cashflow
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Allocated Equity</span>
            <BiPieChartAlt2 className="text-sm text-slate-400" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.totalAllocatedPercentage || 0).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            Unallocated: {Number(stats.unallocatedPercentage || 0).toFixed(2)}%
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Total Shares</span>
            <BiAward className="text-sm text-slate-400" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.totalSharesAllocated || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            {stats.activeShareholders} active partners
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Net Profit</span>
            <BiDollarCircle className="text-sm text-emerald-500" />
          </div>
          <div className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
            ৳{Number(stats.netProfit || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            Inflow: ৳{Number(stats.totalInflow || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Dividends Disbursed</span>
            <BiTrendingDown className="text-sm text-indigo-500" />
          </div>
          <div className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
            ৳{Number(stats.totalDividendsDisbursed || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            Outflow: ৳{Number(stats.totalOutflow || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Retained Reserve</span>
            <BiTrendingUp className="text-sm text-amber-500" />
          </div>
          <div className="text-lg font-medium text-amber-600 dark:text-amber-400">
            ৳{Math.max(0, Number(stats.netProfit || 0) - Number(stats.totalDividendsDisbursed || 0)).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Platform Reserve (BDT)</span>
        </div>
      </div>

      {showFormPanel && (
        <form onSubmit={handleSaveShareholder} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                {editingShareholder ? `Edit Shareholder: ${editingShareholder.name}` : 'Add Corporate Shareholder'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign cap table equity, title, and linked dividend payout channels.
              </p>
            </div>
            <button type="button" onClick={() => setShowFormPanel(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Full Legal Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Role / Title</label>
              <input
                type="text"
                value={formRoleTitle}
                onChange={(e) => setFormRoleTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Equity Share Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={formSharePercentage}
                onChange={(e) => setFormSharePercentage(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Total Issued Shares</label>
              <input
                type="number"
                min="0"
                value={formTotalShares}
                onChange={(e) => setFormTotalShares(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Payout Method</label>
              <select
                value={formPayoutMethod}
                onChange={(e) => setFormPayoutMethod(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="bank_transfer">Bank Transfer (EFT/NPSB)</option>
                <option value="bkash">bKash (MFS)</option>
                <option value="nagad">Nagad (MFS)</option>
                <option value="rocket">Rocket (DBBL)</option>
                <option value="wire">International Wire Transfer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Account / MFS Number</label>
              <input
                type="text"
                value={formAccountNumber || formMfsNumber}
                onChange={(e) => {
                  setFormAccountNumber(e.target.value);
                  setFormMfsNumber(e.target.value);
                }}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            {formPayoutMethod === 'bank_transfer' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Bank Name</label>
                  <input
                    type="text"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Account Holder Name</label>
                  <input
                    type="text"
                    value={formAccountHolder}
                    onChange={(e) => setFormAccountHolder(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Branch Name</label>
                  <input
                    type="text"
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Routing Number</label>
                  <input
                    type="text"
                    value={formRoutingNumber}
                    onChange={(e) => setFormRoutingNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Internal Governance Notes</label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="shareholder-active-panel"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="shareholder-active-panel" className="text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer">
                Active Shareholder (Eligible for dividend payout calculations)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowFormPanel(false)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <BiLoaderAlt className="animate-spin text-sm" />}
              <span>{editingShareholder ? 'Save Changes' : 'Create Shareholder'}</span>
            </button>
          </div>
        </form>
      )}

      {dividendTarget && (
        <form onSubmit={handleDisburseDividend} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Disburse Dividend Payout for {dividendTarget.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Equity Share: {dividendTarget.share_percentage}% &middot; Eligible Dividend: ৳{Number(dividendTarget.eligible_dividend || 0).toLocaleString()}
              </p>
            </div>
            <button type="button" onClick={() => setDividendTarget(null)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Dividend Amount (BDT)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={dividendAmount}
                onChange={(e) => setDividendAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Notes / Resolution Reference</label>
              <input
                type="text"
                value={dividendNotes}
                onChange={(e) => setDividendNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDividendTarget(null)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={payingDividend}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {payingDividend && <BiLoaderAlt className="animate-spin text-sm" />}
              <span>Confirm Payout</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full md:w-72">
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
              Search Shareholders
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-normal outline-hidden focus:border-slate-400"
              />
              <BiSearch className="absolute left-2.5 top-2 text-sm text-slate-400 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <BiX className="text-sm" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50 text-xs">
              {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded font-normal capitalize cursor-pointer transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <span className="text-slate-400 font-normal">
              Showing {filteredShareholders.length} of {shareholders.length} partners
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading cap table & shareholders..." />
        ) : filteredShareholders.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-slate-400">
            <p className="font-medium text-slate-600 dark:text-slate-300">No Shareholders Found</p>
            <p className="text-xs">Add founders, partners, or equity investors to track equity shares.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3">Role / Designation</th>
                  <th className="py-2.5 px-3 text-right">Invested Capital</th>
                  <th className="py-2.5 px-3 text-right">Equity Share</th>
                  <th className="py-2.5 px-3 text-right">Shares Issued</th>
                  <th className="py-2.5 px-3 text-right">Eligible Dividend</th>
                  <th className="py-2.5 px-3 text-right">Total Withdrawn</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-normal">
                {filteredShareholders.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                        {s.role_title || 'Shareholder'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ৳{Number(s.total_invested || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {Number(s.share_percentage || 0).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {Number(s.total_shares || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      ৳{Number(s.eligible_dividend || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      ৳{Number(s.total_withdrawn || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {confirmDeleteId === s.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => handleDeleteShareholder(s)}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-medium cursor-pointer disabled:opacity-50"
                          >
                            {deleting ? 'Removing...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDividendPanel(s)}
                            disabled={!s.is_active}
                            className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
                          >
                            <BiMoneyWithdraw className="text-xs" />
                            <span>Dividend</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPanel(s)}
                            className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                          >
                            <BiEdit className="text-sm" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="p-1 rounded border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                          >
                            <BiTrash className="text-sm" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">
              Recent Shareholder Dividend Withdrawals
            </h2>
            <p className="text-[11px] text-slate-400">Disbursement history for equity payouts.</p>
          </div>
          <Link href="/developer/withdraws" className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:underline">
            View All
          </Link>
        </div>

        {recentWithdrawals.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No dividend payouts have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                  <th className="py-2.5 px-3">ID / Date</th>
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {recentWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      #{w.id} &middot; {new Date(w.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {w.shareholder_name || 'Shareholder'}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500">
                      {w.method?.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      ৳{Number(w.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                          w.status === 'processed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : w.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {w.processed_by_name || 'Automated / Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

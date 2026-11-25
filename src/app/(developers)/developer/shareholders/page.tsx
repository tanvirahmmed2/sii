'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiAward,
  BiPlus,
  BiRefresh,
  BiFilter,
  BiCheckCircle,
  BiXCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiTrendingUp,
  BiTrendingDown,
  BiDollarCircle,
  BiMoneyWithdraw,
  BiUserCheck,
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

  const [showModal, setShowModal] = useState<boolean>(false);
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

  const [showDividendModal, setShowDividendModal] = useState<boolean>(false);
  const [dividendTarget, setDividendTarget] = useState<Shareholder | null>(null);
  const [dividendAmount, setDividendAmount] = useState<string>('');
  const [dividendNotes, setDividendNotes] = useState<string>('');
  const [payingDividend, setPayingDividend] = useState<boolean>(false);

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Shareholder | null>(null);
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

  const openCreateModal = () => {
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
    setShowModal(true);
  };

  const openEditModal = (s: Shareholder) => {
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
    setShowModal(true);
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
        setShowModal(false);
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

  const openDividendModal = (s: Shareholder) => {
    setDividendTarget(s);
    setDividendAmount(s.eligible_dividend > 0 ? String(Math.floor(s.eligible_dividend)) : '');
    setDividendNotes(`Shareholder dividend distribution to ${s.name} (${s.share_percentage}% equity)`);
    setShowDividendModal(true);
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
        setShowDividendModal(false);
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

  const handleDeleteShareholder = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/marketing/developer/shareholders?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Shareholder ${deleteTarget.name} removed successfully.`);
        setShowDeleteModal(false);
        setDeleteTarget(null);
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

      const nameMatch = (s.name || '').toLowerCase().includes(term);
      const emailMatch = (s.email || '').toLowerCase().includes(term);
      const roleMatch = (s.role_title || '').toLowerCase().includes(term);
      const phoneMatch = (s.phone || '').toLowerCase().includes(term);
      const methodMatch = (s.payout_method || '').toLowerCase().includes(term);

      return nameMatch || emailMatch || roleMatch || phoneMatch || methodMatch;
    });
  }, [shareholders, searchTerm, statusFilter]);

  return (
    <div className="w-full space-y-6 text-xs text-slate-800 dark:text-slate-200">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-base" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiInfoCircle className="text-base" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Shareholders, Equity &amp; Dividends
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
              Corporate Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Maintain cap table equity distribution, calculate dividend entitlement from net platform profits, and disburse shareholder withdrawals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchShareholdersData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
          <Link
            href="/developer/withdraws"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5"
          >
            <BiMoneyWithdraw className="text-base" />
            <span>Withdrawals</span>
          </Link>
          <Link
            href="/developer/cashflow"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5"
          >
            <BiTrendingUp className="text-base" />
            <span>Cash Flow</span>
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer shadow-md shadow-secondary/20 flex items-center gap-1.5"
          >
            <BiPlus className="text-base" />
            <span>New Shareholder</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Allocated Equity</span>
            <BiPieChartAlt2 className="text-base text-secondary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {Number(stats.totalAllocatedPercentage || 0).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Unallocated:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Number(stats.unallocatedPercentage || 0).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Total Issued Shares</span>
            <BiAward className="text-base text-secondary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {Number(stats.totalSharesAllocated || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Shareholders:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {stats.activeShareholders} active
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Net Platform Profit</span>
            <BiDollarCircle className="text-base text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            ৳{Number(stats.netProfit || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Sales Revenue:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(stats.totalInflow || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Dividends Disbursed</span>
            <BiTrendingDown className="text-base text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            ৳{Number(stats.totalDividendsDisbursed || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Total Outflow:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(stats.totalOutflow || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Retained Earnings</span>
            <BiTrendingUp className="text-base text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            ৳{Math.max(0, Number(stats.netProfit || 0) - Number(stats.totalDividendsDisbursed || 0)).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Platform Reserve</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">BDT</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Search Shareholders
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
              />
              <BiSearch className="absolute left-3 top-2.5 text-base text-slate-400 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <BiX className="text-base" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold text-xs flex items-center gap-1">
                <BiFilter className="text-sm" />
                <span>Status:</span>
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
                {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg font-semibold capitalize cursor-pointer transition ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-slate-400 font-medium">
              Showing {filteredShareholders.length} of {shareholders.length} partners
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading cap table & shareholders..." />
        ) : filteredShareholders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BiAward className="text-3xl mx-auto text-slate-400" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No Shareholders Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add founders, partners, or equity investors to track profit share and process dividend distributions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Shareholder</th>
                  <th className="py-3 px-3">Role / Designation</th>
                  <th className="py-3 px-3 text-right">Equity Share</th>
                  <th className="py-3 px-3 text-right">Shares Issued</th>
                  <th className="py-3 px-3 text-right">Eligible Dividend</th>
                  <th className="py-3 px-3 text-right">Total Withdrawn</th>
                  <th className="py-3 px-3">Payout Method</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredShareholders.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {s.email}
                      </div>
                      {s.phone && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {s.role_title || 'Shareholder'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {Number(s.share_percentage || 0).toFixed(2)}%
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {Number(s.total_shares || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{Number(s.eligible_dividend || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                      ৳{Number(s.total_withdrawn || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="uppercase text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {s.payout_method?.replace('_', ' ') || 'BANK'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDividendModal(s)}
                          disabled={!s.is_active}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] cursor-pointer disabled:opacity-40 flex items-center gap-1"
                        >
                          <BiMoneyWithdraw className="text-sm" />
                          <span>Pay Dividend</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                        >
                          <BiEdit className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(s);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                        >
                          <BiTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Recent Shareholder Dividend Withdrawals
            </h2>
            <p className="text-[11px] text-slate-500">
              Disbursement history and settlement tracking for equity payouts.
            </p>
          </div>
          <Link
            href="/developer/withdraws"
            className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
          >
            <span>View All Withdrawals</span>
            <BiMoneyWithdraw />
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
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">ID / Date</th>
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {recentWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      #{w.id} &middot; {new Date(w.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {w.shareholder_name || 'Shareholder'}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500">
                      {w.method?.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{Number(w.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {editingShareholder ? 'Edit Shareholder' : 'Add Corporate Shareholder'}
                </h3>
                <p className="text-xs text-slate-500">
                  Assign cap table equity, title, and linked dividend withdrawal channels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSaveShareholder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={formRoleTitle}
                    onChange={(e) => setFormRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Equity Share Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formSharePercentage}
                    onChange={(e) => setFormSharePercentage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Total Issued Shares
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTotalShares}
                    onChange={(e) => setFormTotalShares(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Payout Channel &amp; Bank Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Payout Method
                    </label>
                    <select
                      value={formPayoutMethod}
                      onChange={(e) => setFormPayoutMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    >
                      <option value="bank_transfer">Bank Transfer (EFT/NPSB)</option>
                      <option value="bkash">bKash (MFS)</option>
                      <option value="nagad">Nagad (MFS)</option>
                      <option value="rocket">Rocket (DBBL)</option>
                      <option value="wire">International Wire Transfer</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Account / Mobile Number
                    </label>
                    <input
                      type="text"
                      value={formAccountNumber || formMfsNumber}
                      onChange={(e) => {
                        setFormAccountNumber(e.target.value);
                        setFormMfsNumber(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-mono"
                    />
                  </div>

                  {formPayoutMethod === 'bank_transfer' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={formBankName}
                          onChange={(e) => setFormBankName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={formAccountHolder}
                          onChange={(e) => setFormAccountHolder(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Branch Name
                        </label>
                        <input
                          type="text"
                          value={formBranch}
                          onChange={(e) => setFormBranch(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Routing Number
                        </label>
                        <input
                          type="text"
                          value={formRoutingNumber}
                          onChange={(e) => setFormRoutingNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Internal Governance Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="shareholder-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-secondary focus:ring-secondary/50 cursor-pointer"
                />
                <label htmlFor="shareholder-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active Shareholder (Eligible for dividend payout calculations)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-secondary/20 flex items-center gap-1.5"
                >
                  {submitting && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>{editingShareholder ? 'Save Changes' : 'Create Shareholder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDividendModal && dividendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Disburse Dividend Payout
                </h3>
                <p className="text-xs text-slate-500">
                  Record equity profit distribution for {dividendTarget.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDividendModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Shareholder:</span>
                <span className="font-bold text-slate-900 dark:text-white">{dividendTarget.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Equity Share:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{dividendTarget.share_percentage}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Eligible Dividend:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ৳{Number(dividendTarget.eligible_dividend || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Previous Withdrawn:</span>
                <span className="font-mono text-slate-500">
                  ৳{Number(dividendTarget.total_withdrawn || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleDisburseDividend} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Dividend Distribution Amount (BDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={dividendAmount}
                  onChange={(e) => setDividendAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-mono font-bold text-base"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Notes / Dividend Resolution Reference
                </label>
                <textarea
                  rows={2}
                  value={dividendNotes}
                  onChange={(e) => setDividendNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDividendModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingDividend}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  {payingDividend && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>Confirm Payout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Remove Shareholder
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong>? Their equity allocation ({deleteTarget.share_percentage}%) will be returned to the unallocated equity pool.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteShareholder}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                {deleting && <BiLoaderAlt className="animate-spin text-base" />}
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

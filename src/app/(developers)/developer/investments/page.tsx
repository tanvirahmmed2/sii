'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiTrendingUp,
  BiPlus,
  BiRefresh,
  BiCheckCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiDollarCircle,
  BiSearch,
  BiMoneyWithdraw,
  BiTransferAlt,
  BiCertification,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperInvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [shareClasses, setShareClasses] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalExternalCapital: 0,
    totalReinvestedDividends: 0,
    totalCapTableInvested: 0,
    investmentCount: 0,
    shareholderCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'investments' | 'shares' | 'transfers'>('investments');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showInvestPanel, setShowInvestPanel] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [invShareholderId, setInvShareholderId] = useState<string>('');
  const [invRoundName, setInvRoundName] = useState<string>('Seed Expansion Round');
  const [invShareClassId, setInvShareClassId] = useState<string>('');
  const [invAmount, setInvAmount] = useState<string>('');
  const [invDate, setInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invMethod, setInvMethod] = useState<string>('bank_transfer');
  const [invRef, setInvRef] = useState<string>('');
  const [invNotes, setInvNotes] = useState<string>('');

  const [showWithdrawPanel, setShowWithdrawPanel] = useState<boolean>(false);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [wShareholderId, setWShareholderId] = useState<string>('');
  const [wAmount, setWAmount] = useState<string>('');
  const [wMethod, setWMethod] = useState<string>('bank_transfer');
  const [wRef, setWRef] = useState<string>('');
  const [wNotes, setWNotes] = useState<string>('');

  const fetchInvestmentsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/investments');
      const data = await res.json();
      if (data.success) {
        setInvestments(data.investments || []);
        setShareholders(data.shareholders || []);
        setShareClasses(data.shareClasses || []);
        setShares(data.shares || []);
        setTransfers(data.transfers || []);
        setBalances(data.balances || []);
        if (data.stats) setStats(data.stats);
        if ((data.shareholders || []).length > 0 && !invShareholderId) {
          setInvShareholderId(String(data.shareholders[0].id));
          setWShareholderId(String(data.shareholders[0].id));
        }
        if ((data.shareClasses || []).length > 0 && !invShareClassId) {
          setInvShareClassId(String(data.shareClasses[0].id));
        }
      } else {
        setErrorMessage(data.error || 'Failed to load investment data.');
      }
    } catch {
      setErrorMessage('Network error loading investments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentsData();
  }, []);

  const handleRecordInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invShareholderId || !invAmount || Number(invAmount) <= 0) {
      setErrorMessage('Please choose a shareholder and positive investment amount.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareholder_id: Number(invShareholderId),
          round_name: invRoundName.trim() || 'Capital Injection',
          share_class_id: invShareClassId ? Number(invShareClassId) : null,
          investment_amount: Number(invAmount),
          currency: 'BDT',
          investment_date: invDate,
          payment_method: invMethod,
          payment_reference: invRef.trim(),
          notes: invNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message || 'Investment recorded and equity updated.');
        setShowInvestPanel(false);
        setInvAmount('');
        setInvRef('');
        setInvNotes('');
        fetchInvestmentsData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to record investment.');
      }
    } catch {
      setErrorMessage('Network error recording investment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wShareholderId || !wAmount || Number(wAmount) <= 0) {
      setErrorMessage('Please choose a shareholder and positive withdrawal amount.');
      return;
    }

    setWithdrawing(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/investments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareholder_id: Number(wShareholderId),
          amount: Number(wAmount),
          currency: 'BDT',
          method: wMethod,
          transaction_reference: wRef.trim(),
          notes: wNotes.trim() || 'Shareholder capital divestment',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message || 'Capital withdrawn and equity shares adjusted.');
        setShowWithdrawPanel(false);
        setWAmount('');
        setWRef('');
        setWNotes('');
        fetchInvestmentsData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to process capital withdrawal.');
      }
    } catch {
      setErrorMessage('Network error withdrawing capital.');
    } finally {
      setWithdrawing(false);
    }
  };

  const bdtBal = balances.find((b) => b.currency === 'BDT');
  const selectedWithdrawShareholder = shareholders.find((s) => String(s.id) === wShareholderId);

  const filteredInvestments = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return investments;
    return investments.filter((inv) => {
      return (
        (inv.round_name || '').toLowerCase().includes(q) ||
        (inv.shareholder_name || '').toLowerCase().includes(q) ||
        (inv.payment_reference || '').toLowerCase().includes(q) ||
        (inv.payment_method || '').toLowerCase().includes(q)
      );
    });
  }, [investments, searchTerm]);

  const filteredShares = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return shares;
    return shares.filter((sh) => {
      return (
        (sh.certificate_number || '').toLowerCase().includes(q) ||
        (sh.shareholder_name || '').toLowerCase().includes(q) ||
        (sh.class_name || '').toLowerCase().includes(q)
      );
    });
  }, [shares, searchTerm]);

  const filteredTransfers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return transfers;
    return transfers.filter((tr) => {
      return (
        (tr.transfer_number || '').toLowerCase().includes(q) ||
        (tr.from_shareholder_name || '').toLowerCase().includes(q) ||
        (tr.to_shareholder_name || '').toLowerCase().includes(q) ||
        (tr.transfer_type || '').toLowerCase().includes(q)
      );
    });
  }, [transfers, searchTerm]);

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
            Investments &amp; Shares
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Record funding rounds, share certificates, and adjust equity dynamically on capital divestments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchInvestmentsData}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-sm" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInvestPanel(false);
              setShowWithdrawPanel(!showWithdrawPanel);
            }}
            className="px-3 py-1.5 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            <BiMoneyWithdraw className="text-sm" />
            <span>{showWithdrawPanel ? 'Close Withdraw' : 'Withdraw Capital'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWithdrawPanel(false);
              setShowInvestPanel(!showInvestPanel);
            }}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            <BiPlus className="text-sm" />
            <span>{showInvestPanel ? 'Close Form' : 'Record Investment'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link href="/developer/shareholders" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Shareholders
        </Link>
        <Link href="/developer/investments" className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Total Active Capital</span>
            <BiDollarCircle className="text-sm text-slate-400" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ৳{Number(stats.totalCapTableInvested || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">{stats.shareholderCount} partners</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">External Funding</span>
            <BiTrendingUp className="text-sm text-emerald-500" />
          </div>
          <div className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
            ৳{Number(stats.totalExternalCapital || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">{stats.investmentCount} recorded entries</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Reinvested Profits</span>
            <BiCertification className="text-sm text-indigo-500" />
          </div>
          <div className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
            ৳{Number(stats.totalReinvestedDividends || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Compounded Equity</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Platform Cash Balance</span>
            <BiDollarCircle className="text-sm text-amber-500" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">BDT Liquidity</span>
        </div>
      </div>

      {showInvestPanel && (
        <form onSubmit={handleRecordInvestment} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">Record Capital Investment</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inject capital and automatically recalculate equity shares across the cap table.
              </p>
            </div>
            <button type="button" onClick={() => setShowInvestPanel(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Investor / Shareholder</label>
              <select
                value={invShareholderId}
                onChange={(e) => setInvShareholderId(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                {shareholders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (৳{Number(s.total_invested || 0).toLocaleString()} &middot; {s.share_percentage}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Funding Round Name</label>
              <input
                type="text"
                required
                value={invRoundName}
                onChange={(e) => setInvRoundName(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Share Class</label>
              <select
                value={invShareClassId}
                onChange={(e) => setInvShareClassId(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                {shareClasses.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.class_name} ({sc.class_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Investment Amount (BDT)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Investment Date</label>
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Payment Method</label>
              <select
                value={invMethod}
                onChange={(e) => setInvMethod(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="bank_transfer">Bank Wire Transfer</option>
                <option value="cash">Cash Capital</option>
                <option value="cheque">Corporate Cheque</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Wire Reference</label>
              <input
                type="text"
                value={invRef}
                onChange={(e) => setInvRef(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Governance Notes</label>
              <input
                type="text"
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowInvestPanel(false)}
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
              <span>Inject Capital &amp; Recalculate Equity</span>
            </button>
          </div>
        </form>
      )}

      {showWithdrawPanel && (
        <form onSubmit={handleWithdrawCapital} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">Withdraw Investment Capital</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedWithdrawShareholder
                  ? `Max withdrawable for ${selectedWithdrawShareholder.name}: ৳${Number(selectedWithdrawShareholder.total_invested || 0).toLocaleString()}.`
                  : 'Withdrawing reduces equity percentage proportionally across the cap table.'}
              </p>
            </div>
            <button type="button" onClick={() => setShowWithdrawPanel(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Shareholder Exiting Capital</label>
              <select
                value={wShareholderId}
                onChange={(e) => setWShareholderId(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                {shareholders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (৳{Number(s.total_invested || 0).toLocaleString()} &middot; {s.share_percentage}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Withdrawal Amount (BDT)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={wAmount}
                onChange={(e) => setWAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Disbursement Method</label>
              <select
                value={wMethod}
                onChange={(e) => setWMethod(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Bank / Reference Details</label>
              <input
                type="text"
                value={wRef}
                onChange={(e) => setWRef(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Resolution Notes</label>
              <input
                type="text"
                value={wNotes}
                onChange={(e) => setWNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowWithdrawPanel(false)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={withdrawing}
              className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {withdrawing && <BiLoaderAlt className="animate-spin text-sm" />}
              <span>Withdraw &amp; Adjust Shares</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full md:w-72">
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
              Search Investments &amp; Certificates
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('investments')}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === 'investments'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-normal'
                }`}
              >
                Investments ({investments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shares')}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === 'shares'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-normal'
                }`}
              >
                Certificates ({shares.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transfers')}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === 'transfers'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-normal'
                }`}
              >
                Transfers ({transfers.length})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading equity & investment ledger..." />
        ) : activeTab === 'investments' ? (
          filteredInvestments.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-slate-400">
              <p className="font-medium text-slate-600 dark:text-slate-300">No Investments Recorded</p>
              <p className="text-xs">Record capital injections to track rounds and recalculate cap table equity.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                    <th className="py-2.5 px-3">Date / Round</th>
                    <th className="py-2.5 px-3">Shareholder</th>
                    <th className="py-2.5 px-3">Type / Method</th>
                    <th className="py-2.5 px-3 text-right">Shares Issued</th>
                    <th className="py-2.5 px-3 text-right">Equity % After</th>
                    <th className="py-2.5 px-3 text-right">Investment Amount</th>
                    <th className="py-2.5 px-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {filteredInvestments.map((inv) => {
                    const sym = inv.currency === 'BDT' ? '৳' : '$';
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900 dark:text-white block">{inv.round_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(inv.investment_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{inv.shareholder_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{inv.shareholder_code}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {inv.is_dividend_reinvestment ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                              DIVIDEND REINVEST
                            </span>
                          ) : (
                            <span className="uppercase text-[10px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {inv.payment_method?.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          +{Number(inv.shares_allocated || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                          {Number(inv.share_percentage || 0).toFixed(3)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          +{sym}{Number(inv.investment_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-mono text-slate-500">
                          {inv.payment_reference || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'shares' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                  <th className="py-2.5 px-3">Certificate #</th>
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3">Share Class</th>
                  <th className="py-2.5 px-3 text-right">Shares Count</th>
                  <th className="py-2.5 px-3 text-right">Par Value</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredShares.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">{sh.certificate_number}</td>
                    <td className="py-2.5 px-3 font-medium">{sh.shareholder_name}</td>
                    <td className="py-2.5 px-3">{sh.class_name} ({sh.class_code})</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{Number(sh.number_of_shares).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">৳{Number(sh.issue_price_per_share).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">৳{Number(sh.total_amount_paid).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(sh.issue_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                  <th className="py-2.5 px-3">Transfer #</th>
                  <th className="py-2.5 px-3">From / To</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Shares Moved</th>
                  <th className="py-2.5 px-3 text-right">Value</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredTransfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">{tr.transfer_number}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium">{tr.from_shareholder_name}</span>
                      <BiTransferAlt className="inline mx-1.5 text-slate-400" />
                      <span className="font-medium">{tr.to_shareholder_name}</span>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-medium">{tr.transfer_type?.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{Number(tr.shares_transferred).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">৳{Number(tr.total_transfer_value).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(tr.transfer_date).toLocaleDateString()}</td>
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

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
  BiAward,
  BiMoneyWithdraw,
  BiCalendar,
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

  const [showInvestModal, setShowInvestModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [invShareholderId, setInvShareholderId] = useState<string>('');
  const [invRoundName, setInvRoundName] = useState<string>('Seed Expansion Round');
  const [invShareClassId, setInvShareClassId] = useState<string>('');
  const [invAmount, setInvAmount] = useState<string>('');
  const [invDate, setInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invMethod, setInvMethod] = useState<string>('bank_transfer');
  const [invRef, setInvRef] = useState<string>('');
  const [invNotes, setInvNotes] = useState<string>('');

  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
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
        setShowInvestModal(false);
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
        setShowWithdrawModal(false);
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
              Investments, Shares &amp; Dynamic Equity
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
              Capital Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inject funding rounds, track dividend reinvestments, issue share certificates, and adjust equity dynamically on capital withdrawals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchInvestmentsData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
          <Link
            href="/developer/shareholders"
            className="px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5"
          >
            <BiAward className="text-base" />
            <span>Cap Table</span>
          </Link>
          <Link
            href="/developer/monthly-accounting"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5"
          >
            <BiCalendar className="text-base" />
            <span>Monthly Profit</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold cursor-pointer flex items-center gap-1.5"
          >
            <BiMoneyWithdraw className="text-base" />
            <span>Withdraw Capital</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInvestModal(true)}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer shadow-md shadow-secondary/20 flex items-center gap-1.5"
          >
            <BiPlus className="text-base" />
            <span>Record Investment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Total Active Capital</span>
            <BiDollarCircle className="text-base text-secondary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ৳{Number(stats.totalCapTableInvested || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Shareholders:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.shareholderCount} partners</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>External Funding Rounds</span>
            <BiTrendingUp className="text-base text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            ৳{Number(stats.totalExternalCapital || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Injected Entries:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.investmentCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Reinvested Profits</span>
            <BiCertification className="text-base text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            ৳{Number(stats.totalReinvestedDividends || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Compounded Equity</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Platform Cash Balance</span>
            <BiDollarCircle className="text-base text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Liquidity Pool</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">BDT</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('investments')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'investments'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Investments &amp; Capital Injections ({investments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shares')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'shares'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Issued Share Certificates ({shares.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Share Transfers &amp; Buybacks ({transfers.length})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Search Investments &amp; Certificates
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

          <div className="text-slate-400 font-medium">
            {activeTab === 'investments' && `Showing ${filteredInvestments.length} investment records`}
            {activeTab === 'shares' && `Showing ${filteredShares.length} share certificates`}
            {activeTab === 'transfers' && `Showing ${filteredTransfers.length} transfers & buybacks`}
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading equity & investment ledger..." />
        ) : activeTab === 'investments' ? (
          filteredInvestments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BiTrendingUp className="text-3xl mx-auto text-slate-400" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No Investments Recorded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Record Investment&quot; to inject shareholder capital and automatically calculate cap table shares.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Date / Round</th>
                    <th className="py-3 px-3">Shareholder</th>
                    <th className="py-3 px-3">Type / Method</th>
                    <th className="py-3 px-3 text-right">Shares Issued</th>
                    <th className="py-3 px-3 text-right">Equity % After</th>
                    <th className="py-3 px-3 text-right">Investment Amount</th>
                    <th className="py-3 px-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredInvestments.map((inv) => {
                    const sym = inv.currency === 'BDT' ? '৳' : '$';
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{inv.round_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(inv.investment_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{inv.shareholder_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{inv.shareholder_code}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          {inv.is_dividend_reinvestment ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                              DIVIDEND REINVEST
                            </span>
                          ) : (
                            <span className="uppercase text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {inv.payment_method?.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          +{Number(inv.shares_allocated || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-secondary">
                          {Number(inv.share_percentage || 0).toFixed(3)}%
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          +{sym}{Number(inv.investment_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-[11px] font-mono text-slate-500">
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
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Certificate #</th>
                  <th className="py-3 px-3">Shareholder</th>
                  <th className="py-3 px-3">Share Class</th>
                  <th className="py-3 px-3 text-right">Shares Count</th>
                  <th className="py-3 px-3 text-right">Par Value</th>
                  <th className="py-3 px-3 text-right">Total Paid</th>
                  <th className="py-3 px-3">Issue Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredShares.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{sh.certificate_number}</td>
                    <td className="py-3 px-3 font-semibold">{sh.shareholder_name}</td>
                    <td className="py-3 px-3">{sh.class_name} ({sh.class_code})</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{Number(sh.number_of_shares).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono">৳{Number(sh.issue_price_per_share).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">৳{Number(sh.total_amount_paid).toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(sh.issue_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Transfer #</th>
                  <th className="py-3 px-3">From / To</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Shares Moved</th>
                  <th className="py-3 px-3 text-right">Value</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTransfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{tr.transfer_number}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold">{tr.from_shareholder_name}</span>
                      <BiTransferAlt className="inline mx-1.5 text-slate-400" />
                      <span className="font-semibold">{tr.to_shareholder_name}</span>
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold">{tr.transfer_type?.replace('_', ' ')}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{Number(tr.shares_transferred).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">৳{Number(tr.total_transfer_value).toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(tr.transfer_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Record Capital Investment</h3>
              <button
                type="button"
                onClick={() => setShowInvestModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleRecordInvestment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Investor / Shareholder
                </label>
                <select
                  value={invShareholderId}
                  onChange={(e) => setInvShareholderId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  {shareholders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Invested: ৳{Number(s.total_invested || 0).toLocaleString()} &middot; {s.share_percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Funding Round Name
                  </label>
                  <input
                    type="text"
                    required
                    value={invRoundName}
                    onChange={(e) => setInvRoundName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Share Class
                  </label>
                  <select
                    value={invShareClassId}
                    onChange={(e) => setInvShareClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    {shareClasses.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.class_name} ({sc.class_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Investment Amount (BDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Investment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Payment Method
                  </label>
                  <select
                    value={invMethod}
                    onChange={(e) => setInvMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="bank_transfer">Bank Wire Transfer</option>
                    <option value="cash">Cash Capital</option>
                    <option value="cheque">Corporate Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Wire Reference / Ref ID
                  </label>
                  <input
                    type="text"
                    value={invRef}
                    onChange={(e) => setInvRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Governance Notes
                </label>
                <textarea
                  rows={2}
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInvestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>Inject Capital &amp; Recalculate Equity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Withdraw Investment Capital</h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleWithdrawCapital} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Shareholder Exiting Capital
                </label>
                <select
                  value={wShareholderId}
                  onChange={(e) => setWShareholderId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  {shareholders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Invested: ৳{Number(s.total_invested || 0).toLocaleString()} &middot; {s.share_percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              {selectedWithdrawShareholder && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  Max withdrawable capital: <strong>৳{Number(selectedWithdrawShareholder.total_invested || 0).toLocaleString()}</strong>. Withdrawing reduces equity percentage proportionally across the cap table.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Capital Withdrawal Amount (BDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={wAmount}
                    onChange={(e) => setWAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Disbursement Method
                  </label>
                  <select
                    value={wMethod}
                    onChange={(e) => setWMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Bank / Reference Details
                </label>
                <input
                  type="text"
                  value={wRef}
                  onChange={(e) => setWRef(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Resolution Notes
                </label>
                <textarea
                  rows={2}
                  value={wNotes}
                  onChange={(e) => setWNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawing}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {withdrawing && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>Withdraw &amp; Adjust Shares</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

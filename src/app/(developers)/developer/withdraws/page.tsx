'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiMoneyWithdraw,
  BiPlus,
  BiRefresh,
  BiCheckCircle,
  BiXCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiTrendingDown,
  BiBuildingHouse,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperWithdrawsPage() {
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('BDT');
  const [method, setMethod] = useState<string>('bank_transfer');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [routingNumber, setRoutingNumber] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [statusModalTarget, setStatusModalTarget] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('processed');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const fetchWithdraws = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (currencyFilter !== 'ALL') params.set('currency', currencyFilter);

      const res = await fetch(`/api/marketing/developer/withdraws?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWithdraws(data.records || []);
        setBalances(data.balances || []);
      } else {
        setErrorMessage(data.error || 'Failed to fetch withdraw records');
      }
    } catch {
      setErrorMessage('Network error loading withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdraws();
  }, [statusFilter, currencyFilter]);

  const handleCreateWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/withdraws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          method,
          notes,
          account_details: {
            bank_name: bankName,
            account_number: accountNumber,
            account_holder: accountHolder,
            branch,
            routing_number: routingNumber,
            phone,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Withdrawal request for ${amount} ${currency} submitted successfully.`);
        setShowRequestModal(false);
        setAmount('');
        setNotes('');
        setAccountNumber('');
        fetchWithdraws();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to submit withdrawal request.');
      }
    } catch {
      setErrorMessage('Network error submitting withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalTarget) return;

    setUpdatingStatus(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/withdraws', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: statusModalTarget.id,
          status: newStatus,
          transaction_reference: transactionRef,
          notes: statusNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Withdrawal #${statusModalTarget.id} updated to ${newStatus}.`);
        setStatusModalTarget(null);
        setTransactionRef('');
        setStatusNotes('');
        fetchWithdraws();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to update withdrawal status.');
      }
    } catch {
      setErrorMessage('Network error updating withdrawal.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const bdtBal = balances.find((b) => b.currency === 'BDT');
  const usdBal = balances.find((b) => b.currency === 'USD');

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
              Platform Withdrawals & Payouts
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
              Disbursements
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Process platform balance withdrawals, bank transfers, and MFS disbursements with automatic ledger synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchWithdraws}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
          <Link
            href="/developer/cashflow"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5"
          >
            <BiTrendingDown className="text-base" />
            <span>Cashflow Stream</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer shadow-md shadow-secondary/20 flex items-center gap-1.5"
          >
            <BiPlus className="text-base" />
            <span>Request Withdrawal</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
            BDT Available for Payout
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Disbursed:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(bdtBal?.total_withdrawn || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
            USD Available for Payout
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ${Number(usdBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Disbursed:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ${Number(usdBal?.total_withdrawn || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
            Pending Approval Requests
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {withdraws.filter((w) => w.status === 'pending').length}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Total Requests:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{withdraws.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold text-xs">Filter Status:</span>
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
              {['ALL', 'pending', 'approved', 'processed', 'rejected'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize cursor-pointer transition ${
                    statusFilter === s
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
              {['ALL', 'BDT', 'USD'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrencyFilter(c)}
                  className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition ${
                    currencyFilter === c
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <span className="text-slate-400 font-medium">
            Showing {withdraws.length} withdrawal records
          </span>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading withdrawal records..." />
        ) : withdraws.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BiMoneyWithdraw className="text-3xl mx-auto text-slate-400" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No Withdrawal Records</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Submit a new withdrawal request to initiate disbursement from the platform available balance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">ID / Requested Date</th>
                  <th className="py-3 px-3">Requester</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Disbursement Method</th>
                  <th className="py-3 px-3">Account Information</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {withdraws.map((w) => {
                  const sym = w.currency === 'BDT' ? '৳' : '$';
                  const details = typeof w.account_details === 'string' ? JSON.parse(w.account_details || '{}') : (w.account_details || {});

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">#{w.id}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(w.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {w.requester_name || `Dev #${w.requested_by_id}`}
                        </span>
                        <span className="text-[11px] text-slate-400">{w.requester_email}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {sym}{Number(w.amount).toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">{w.currency}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {w.method.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-[11px]">
                        {details.bank_name && (
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <BiBuildingHouse className="text-xs text-slate-400" />
                            <span>{details.bank_name}</span>
                          </div>
                        )}
                        {details.account_number && (
                          <div className="font-mono text-slate-600 dark:text-slate-400">
                            A/C: {details.account_number}
                          </div>
                        )}
                        {details.account_holder && (
                          <div className="text-slate-500 text-[10px]">Holder: {details.account_holder}</div>
                        )}
                        {details.phone && (
                          <div className="font-mono text-slate-500">MFS: {details.phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            w.status === 'processed'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : w.status === 'approved'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                              : w.status === 'rejected'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {w.status !== 'processed' && w.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalTarget(w);
                              setNewStatus(w.status === 'pending' ? 'approved' : 'processed');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[11px] hover:opacity-90 transition cursor-pointer"
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Payout Withdrawal</h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleCreateWithdraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Withdrawal Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary cursor-pointer"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disbursement Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer (EFT / RTGS)</option>
                  <option value="bkash">bKash Personal / Merchant</option>
                  <option value="nagad">Nagad Personal</option>
                  <option value="rocket">Rocket DBBL</option>
                </select>
              </div>

              {method === 'bank_transfer' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Branch & Routing No.
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    MFS Account Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Update Withdrawal #{statusModalTarget.id}
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalTarget(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary cursor-pointer"
                >
                  <option value="approved">Approved</option>
                  <option value="processed">Processed (Disburse &amp; Deduct Balance)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank / MFS Transaction Reference
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Approval Notes
                </label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

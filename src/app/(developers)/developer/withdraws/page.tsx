'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiMoneyWithdraw,
  BiPlus,
  BiRefresh,
  BiCheckCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiBuildingHouse,
  BiSearch,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperWithdrawsPage() {
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showRequestPanel, setShowRequestPanel] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [withdrawType, setWithdrawType] = useState<string>('developer');
  const [selectedShareholderId, setSelectedShareholderId] = useState<string>('');
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

  const [statusTarget, setStatusTarget] = useState<any>(null);
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

      const [resW, resS] = await Promise.all([
        fetch(`/api/marketing/developer/withdraws?${params.toString()}`),
        fetch('/api/marketing/developer/shareholders?currency=BDT'),
      ]);

      const dataW = await resW.json();
      const dataS = await resS.json();

      if (dataW.success) {
        setWithdraws(dataW.records || []);
        setBalances(dataW.balances || []);
      } else {
        setErrorMessage(dataW.error || 'Failed to fetch withdraw records');
      }

      if (dataS.success) {
        setShareholders(dataS.shareholders || []);
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

  const handleShareholderSelect = (idStr: string) => {
    setSelectedShareholderId(idStr);
    const sh = shareholders.find((s) => String(s.id) === idStr);
    if (sh) {
      setMethod(sh.payout_method || 'bank_transfer');
      const details = typeof sh.account_details === 'string'
        ? (JSON.parse(sh.account_details || '{}') || {})
        : (sh.account_details || {});
      setBankName(details.bank_name || '');
      setAccountNumber(details.account_number || '');
      setAccountHolder(details.account_holder || sh.name || '');
      setBranch(details.branch || '');
      setRoutingNumber(details.routing_number || '');
      setPhone(details.phone || sh.phone || '');
      if (sh.eligible_dividend > 0) {
        setAmount(String(Math.floor(sh.eligible_dividend)));
      }
    }
  };

  const handleCreateWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    if (withdrawType === 'dividend' && !selectedShareholderId) {
      setErrorMessage('Please select a shareholder for dividend payout.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        amount: Number(amount),
        currency,
        method,
        notes,
        withdraw_type: withdrawType,
        account_details: {
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          branch,
          routing_number: routingNumber,
          phone,
        },
      };

      if (withdrawType === 'dividend') {
        payload.shareholder_id = Number(selectedShareholderId);
      }

      const res = await fetch('/api/marketing/developer/withdraws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Withdrawal request for ${amount} ${currency} submitted successfully.`);
        setShowRequestPanel(false);
        setAmount('');
        setNotes('');
        setAccountNumber('');
        setSelectedShareholderId('');
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
    if (!statusTarget) return;

    setUpdatingStatus(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/withdraws', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: statusTarget.id,
          status: newStatus,
          transaction_reference: transactionRef,
          notes: statusNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Withdrawal #${statusTarget.id} updated to ${newStatus}.`);
        setStatusTarget(null);
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

  const filteredWithdraws = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return withdraws.filter((w) => {
      if (typeFilter === 'dividend' && w.withdraw_type !== 'dividend') return false;
      if (typeFilter === 'payout' && w.withdraw_type === 'dividend') return false;
      if (!q) return true;

      const details = typeof w.account_details === 'string' ? JSON.parse(w.account_details || '{}') : (w.account_details || {});
      return (
        (w.requester_name || '').toLowerCase().includes(q) ||
        (w.requester_email || '').toLowerCase().includes(q) ||
        (w.shareholder_name || '').toLowerCase().includes(q) ||
        (w.shareholder_email || '').toLowerCase().includes(q) ||
        (details.bank_name || '').toLowerCase().includes(q) ||
        (details.account_number || '').toLowerCase().includes(q) ||
        (details.phone || '').toLowerCase().includes(q) ||
        (w.transaction_reference || '').toLowerCase().includes(q) ||
        String(w.id).includes(q) ||
        (w.notes || '').toLowerCase().includes(q) ||
        (w.method || '').toLowerCase().includes(q)
      );
    });
  }, [withdraws, searchTerm, typeFilter]);

  const bdtBal = balances.find((b) => b.currency === 'BDT');
  const usdBal = balances.find((b) => b.currency === 'USD');

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
            Withdrawals &amp; Payouts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Process platform balance withdrawals, shareholder dividends, bank transfers, and MFS disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchWithdraws}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-sm" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusTarget(null);
              setWithdrawType('developer');
              setSelectedShareholderId('');
              setShowRequestPanel(!showRequestPanel);
            }}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            <BiPlus className="text-sm" />
            <span>{showRequestPanel ? 'Close Form' : 'Request Withdrawal'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link href="/developer/shareholders" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
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
        <Link href="/developer/withdraws" className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          Withdrawals
        </Link>
        <Link href="/developer/cashflow" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
          Cashflow
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-slate-500 font-normal text-xs block">BDT Available for Payout</span>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            Disbursed: ৳{Number(bdtBal?.total_withdrawn || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-slate-500 font-normal text-xs block">USD Available for Payout</span>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(usdBal?.available_balance || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            Disbursed: ${Number(usdBal?.total_withdrawn || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-slate-500 font-normal text-xs block">Pending Approvals</span>
          <div className="text-lg font-medium text-amber-600 dark:text-amber-400">
            {withdraws.filter((w) => w.status === 'pending').length}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Total Requests: {withdraws.length}</span>
        </div>
      </div>

      {showRequestPanel && (
        <form onSubmit={handleCreateWithdraw} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">Request Payout Withdrawal</h2>
            <button type="button" onClick={() => setShowRequestPanel(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Withdrawal Category</label>
              <select
                value={withdrawType}
                onChange={(e) => {
                  setWithdrawType(e.target.value);
                  setSelectedShareholderId('');
                }}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="developer">Developer Payout</option>
                <option value="dividend">Shareholder Dividend</option>
              </select>
            </div>

            {withdrawType === 'dividend' && (
              <div className="space-y-1">
                <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Shareholder Beneficiary</label>
                <select
                  value={selectedShareholderId}
                  onChange={(e) => handleShareholderSelect(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                >
                  <option value="">-- Choose Shareholder --</option>
                  {shareholders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.share_percentage}% &middot; Eligible: ৳{Number(s.eligible_dividend || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Disbursement Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
              </select>
            </div>

            {method === 'bank_transfer' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Account Number</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Account Holder Name</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Branch &amp; Routing</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-normal text-slate-700 dark:text-slate-300">MFS Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
                />
              </div>
            )}

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowRequestPanel(false)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {statusTarget && (
        <form onSubmit={handleUpdateStatus} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">
              Update Withdrawal #{statusTarget.id}
            </h2>
            <button type="button" onClick={() => setStatusTarget(null)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              >
                <option value="approved">Approved</option>
                <option value="processed">Processed (Disburse &amp; Deduct Balance)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Transaction Reference</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">Approval Notes</label>
              <input
                type="text"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStatusTarget(null)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStatus}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {updatingStatus && <BiLoaderAlt className="animate-spin text-sm" />}
              <span>Save Status</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full md:w-72">
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
              Search Withdrawals
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
              {['ALL', 'pending', 'approved', 'processed', 'rejected'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded capitalize cursor-pointer transition ${
                    statusFilter === s
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-normal'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50 text-xs">
              {['ALL', 'payout', 'dividend'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded capitalize cursor-pointer transition ${
                    typeFilter === t
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-normal'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50 text-xs">
              {['ALL', 'BDT', 'USD'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrencyFilter(c)}
                  className={`px-2.5 py-1 rounded cursor-pointer transition ${
                    currencyFilter === c
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-normal'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <span className="text-slate-400 font-normal">
              Showing {filteredWithdraws.length} records
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading withdrawal records..." />
        ) : filteredWithdraws.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-slate-400">
            <BiMoneyWithdraw className="text-2xl mx-auto text-slate-400" />
            <p className="font-medium text-slate-600 dark:text-slate-300">No Withdrawal Records</p>
            <p className="text-xs">Submit a withdrawal request to initiate disbursement from available balance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                  <th className="py-2.5 px-3">ID / Date</th>
                  <th className="py-2.5 px-3">Beneficiary / Type</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Account Information</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredWithdraws.map((w) => {
                  const sym = w.currency === 'BDT' ? '৳' : '$';
                  const details = typeof w.account_details === 'string' ? JSON.parse(w.account_details || '{}') : (w.account_details || {});
                  const isDividend = w.withdraw_type === 'dividend' || Boolean(w.shareholder_name);

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-medium text-slate-900 dark:text-white block">#{w.id}</span>
                        <span className="text-[10px] text-slate-400">{new Date(w.created_at).toLocaleDateString()}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
                            isDividend
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {isDividend ? 'DIVIDEND' : 'PAYOUT'}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {w.shareholder_name || w.requester_name || `Dev #${w.requested_by_id}`}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{w.shareholder_email || w.requester_email}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span className="font-mono font-medium text-slate-900 dark:text-white">
                          {sym}{Number(w.amount).toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase">{w.currency}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {w.method?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-[11px]">
                        {details.bank_name && (
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <BiBuildingHouse className="text-xs text-slate-400" />
                            <span>{details.bank_name}</span>
                          </div>
                        )}
                        {details.account_number && <div className="font-mono text-slate-500">A/C: {details.account_number}</div>}
                        {details.phone && <div className="font-mono text-slate-500">MFS: {details.phone}</div>}
                        {w.transaction_reference && <div className="font-mono text-[10px] text-slate-400">Ref: {w.transaction_reference}</div>}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            w.status === 'processed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : w.status === 'approved'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : w.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {w.status !== 'processed' && w.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowRequestPanel(false);
                              setStatusTarget(w);
                              setNewStatus(w.status === 'pending' ? 'approved' : 'processed');
                              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-[11px] hover:opacity-90 cursor-pointer"
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
    </div>
  );
}

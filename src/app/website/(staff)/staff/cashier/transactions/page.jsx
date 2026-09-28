'use client';

import React, { useEffect, useState } from 'react';
import { FiDollarSign, FiCalendar, FiCreditCard, FiAlertOctagon } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CashierTransactionsPage = () => {
  const [role, setRole] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndTransactions = async () => {
      try {
        const profileRes = await fetch('/api/staff/me');
        if (!profileRes.ok) {
          setLoading(false);
          return;
        }
        const profileData = await profileRes.json();
        const userRole = profileData.paylod.staff.role;
        setRole(userRole);

        if (userRole === 'cashier') {
          const transRes = await fetch('/api/admin/finance/transactions');
          if (transRes.ok) {
            const transData = await transRes.json();
            setTransactions(transData.paylod?.transactions || []);
          }
        }
      } catch (err) {
        toast.error('Failed to load transaction data.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndTransactions();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading billing records...</span>
      </div>
    );
  }

  // Hardcoded role check guard
  if (role !== 'cashier') {
    return (
      <div className="w-full max-w-md mx-auto mt-16 p-8 bg-red-50 border border-red-100 rounded-3xl text-center flex flex-col items-center gap-4 shadow-sm animate-fade-up">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FiAlertOctagon className="text-red-600 text-xl" />
        </div>
        <div>
          <h2 className="text-base font-bold text-red-800">Access Denied</h2>
          <p className="text-xs text-red-650 mt-1">
            This module is restricted to the <strong>Cashier</strong> role only. You do not have permissions to view this ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiDollarSign className="text-primary animate-pulse" /> Financial Transaction Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review audit transactions, payment methods, and cashier billing activity logged by the finance desk.
        </p>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {transactions.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">💵</span>
            <h3 className="text-sm font-bold text-slate-600">No Transactions Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              No payment transactions have been logged in the ledger yet.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Txn Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type &amp; Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Billed By</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trans) => {
                  const isCredit = (trans.transaction_type || 'Credit').toLowerCase() === 'credit';
                  return (
                    <tr key={trans.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {trans.transaction_number || `#TXN-${trans.id}`}
                          </span>
                          {trans.remarks && (
                            <span className="text-[10px] text-slate-450 font-medium max-w-[220px] truncate">
                              {trans.remarks}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isCredit ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {trans.transaction_type || 'Credit'}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {trans.category || 'General Payment'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                          <FiCreditCard className="text-slate-400 text-xs" />
                          {trans.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-600">
                          {trans.billed_by ? (
                            <span className="font-mono text-primary font-bold">{trans.billed_by}</span>
                          ) : (
                            <span className="text-slate-400 italic">System / Auto</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className="text-slate-400" />
                          {new Date(trans.payment_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 text-right">
                        ৳{Number(trans.amount || 0).toFixed(2)}
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
};

export default CashierTransactionsPage;

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';

function PaymentsContent() {
  const { creator, payments = [], stats = {}, refetch } = useCreator();
  const searchParams = useSearchParams();
  const orderPlaced = searchParams.get('orderPlaced');
  const highlightedPaymentId = searchParams.get('paymentId');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { spentUsd, spentBdt } = payments.reduce(
    (acc, p) => {
      if (['successful', 'completed'].includes(p.status?.toLowerCase())) {
        const amt = Number(p.amount || 0);
        const curr = (p.currency || (p.payment_method === 'BKASH' ? 'BDT' : 'USD')).toUpperCase();
        if (curr === 'BDT') {
          acc.spentBdt += amt;
        } else {
          acc.spentUsd += amt;
        }
      }
      return acc;
    },
    { spentUsd: 0, spentBdt: 0 }
  );

  const filtered = payments.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.transaction_id?.toLowerCase().includes(q) ||
      p.package_name?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q)
    );
  });

  const unpaidCount = payments.filter((p) => ['unpaid', 'pending'].includes(p.status?.toLowerCase())).length;

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Billing & Invoices
          </h1>
          <p className="text-slate-500 text-xs">
            Review transaction receipts, payment statuses, and printable invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/packages"
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>

      {orderPlaced && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          Order placed successfully. Complete your payment below to activate.
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Total Settled</span>
          {spentUsd > 0 && spentBdt > 0 ? (
            <div className="text-sm font-semibold text-slate-900 font-mono space-y-0.5">
              <div>${spentUsd.toFixed(2)} USD</div>
              <div className="text-xs text-slate-600 font-medium">৳{spentBdt.toLocaleString()} BDT</div>
            </div>
          ) : spentBdt > 0 ? (
            <div className="text-sm font-semibold text-slate-900 font-mono">
              ৳{spentBdt.toLocaleString()} BDT
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-900 font-mono">
              ${spentUsd.toFixed(2)} USD
            </div>
          )}
          <span className="text-[10px] text-slate-500">Lifetime payments</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Total Transactions</span>
          <div className="text-sm font-semibold text-slate-900 font-mono">{payments.length}</div>
          <span className="text-[10px] text-slate-500">Issued records</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Pending Invoices</span>
          <div className="text-sm font-semibold text-slate-900 font-mono">{unpaidCount}</div>
          <span className="text-[10px] text-slate-500">{unpaidCount === 0 ? 'All settled' : 'Requires attention'}</span>
        </div>
      </div>

      {/* Search and Invoices Table */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Payment History ({filtered.length})
          </h2>
          <input
            type="text"
            placeholder="Search by ID, package, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-60 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No payment invoices match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Invoice ID</th>
                  <th className="pb-2">Package</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Gateway</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filtered.map((p) => {
                  const isSuccessful = ['successful', 'completed'].includes(p.status?.toLowerCase());
                  const isPending = ['pending', 'unpaid'].includes(p.status?.toLowerCase());

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono text-slate-900 font-medium">
                        INV-{p.id}
                      </td>
                      <td className="py-2.5 font-medium text-slate-900">
                        {p.package_name || 'Standard Tier'}
                      </td>
                      <td className="py-2.5 font-mono font-medium text-slate-900">
                        {p.currency === 'BDT' ? `৳${p.amount}` : `$${Number(p.amount || 0).toFixed(2)}`}{' '}
                        <span className="text-[10px] text-slate-500">{p.currency || 'USD'}</span>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {p.payment_method || 'Paddle'}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                            isSuccessful
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {p.payment_date || p.created_at
                          ? new Date(p.payment_date || p.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-2.5 text-right space-x-2">
                        <Link
                          href={`/creator/${creator?.id}/payments/${p.id}`}
                          className="text-slate-800 hover:underline font-medium"
                        >
                          View Receipt
                        </Link>
                        {isPending && (
                          <Link
                            href={`/creator/${creator?.id}/payments/${p.id}/pay`}
                            className="text-emerald-700 hover:underline font-semibold"
                          >
                            Pay Now
                          </Link>
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

export default function CreatorPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-xs text-slate-500 font-medium">
          Loading billing invoices...
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}

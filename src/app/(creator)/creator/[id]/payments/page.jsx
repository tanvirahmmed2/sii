'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';
import {
  BiCreditCard,
  BiReceipt,
  BiCheckCircle,
  BiX,
  BiPrinter,
  BiDownload,
  BiFile,
  BiSearch,
  BiRefresh,
  BiLoaderAlt,
  BiCheckShield,
  BiRightArrowAlt,
  BiErrorCircle,
  BiWorld,
} from 'react-icons/bi';
import { generateInvoiceData, printReceipt, downloadReceiptFile } from 'src/lib/invoice';


function PaymentsContent() {
  const { creator, payments = [], stats = {}, refetch } = useCreator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderPlaced = searchParams.get('orderPlaced');
  const highlightedPaymentId = searchParams.get('paymentId');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payModalPayment, setPayModalPayment] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const totalSpentFormatted = (Number(stats?.totalSpentCents || 0) / 100).toFixed(2);

  // Auto-open pay modal if arriving from checkout
  useEffect(() => {
    if (orderPlaced && highlightedPaymentId && payments.length > 0) {
      const match = payments.find((p) => String(p.id) === String(highlightedPaymentId));
      if (match && ['unpaid', 'pending'].includes(match.status?.toLowerCase())) {
        const timer = setTimeout(() => {
          setPayModalPayment(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [orderPlaced, highlightedPaymentId, payments]);

  const handlePayNow = async (payment) => {
    setPaying(true);
    setPayError('');
    try {
      const res = await fetch('/api/marketing/creator/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_invoice',
          creatorId: creator.id,
          paymentId: payment.id,
          paymentMethod: 'PADDLE',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSuccessData(data);
        if (refetch) await refetch();
      } else {
        setPayError(data.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setPayError('Network error processing payment.');
    } finally {
      setPaying(false);
    }
  };

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
    <div className="space-y-6">
      {/* Order Placed Notice Banner */}
      {orderPlaced && (
        <div className="p-5 rounded-2xl bg-secondary/10 border border-secondary/20 text-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
              <h3 className="font-bold text-sm text-slate-900">Order Created Successfully!</h3>
            </div>
            <p className="text-xs text-slate-600">
              Your unpaid package invoice is listed below. Click <strong className="font-semibold text-secondary">&quot;Pay Now&quot;</strong> to complete payment via Paddle or bKash and activate your subscription.
            </p>
          </div>
          {highlightedPaymentId && (
            <Link
              href={`/creator/${creator.id}/payments/${highlightedPaymentId}`}
              className="py-2 px-4 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer text-center"
            >
              View Invoice & Pay &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Invoices</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Financial
            </span>
            {unpaidCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {unpaidCount} Unpaid
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Review payment receipts, outstanding invoices, transactions, and activate your package subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch && refetch()}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh transactions"
          >
            <BiRefresh className="text-lg" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ${totalSpentFormatted} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <BiCheckCircle className="text-xs" />
            <span>Completed settlements</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoices Issued</span>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{payments.length}</div>
          <p className="text-[11px] text-slate-500">{unpaidCount > 0 ? `${unpaidCount} awaiting payment` : 'All invoices settled'}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment Gateway</span>
          <div className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#E2136E] text-white flex items-center justify-center text-[10px] font-black">৳</span>
            <span>bKash & Paddle</span>
          </div>
          <p className="text-[11px] text-slate-500">BDT Mobile Banking & Global Card</p>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search by transaction ID, package, method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {payments.length} invoices
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">Invoice / Transaction</th>
                <th className="px-4 py-3 whitespace-nowrap">Package / Plan</th>
                <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 whitespace-nowrap">Method</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const amount = (Number(p.amount_in_cents || (Number(p.amount || 0) * 100)) / 100).toFixed(2);
                  const isUnpaid = p.status === 'UNPAID' || p.status === 'PENDING' || p.status === 'pending';
                  const isCompleted = p.status === 'COMPLETED' || p.status === 'successful' || p.status === 'SUCCESSFUL';
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        String(p.id) === String(highlightedPaymentId) ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {p.transaction_id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {p.package_name || 'Portfolio Package'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                        ${amount} <span className="text-[10px] text-slate-400 font-normal">{p.currency || 'USD'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] font-semibold">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px]">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isUnpaid
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        {isUnpaid && (
                          <Link
                            href={`/creator/${creator.id}/payments/${p.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-secondary hover:bg-secondary-dark text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                          >
                            <span>View & Pay</span>
                            <BiRightArrowAlt className="text-sm" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="View Receipt"
                        >
                          <BiReceipt className="text-slate-500 text-xs" />
                          <span>Receipt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printReceipt(p, creator)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Download / Print PDF Receipt"
                        >
                          <BiDownload className="text-slate-600 text-xs" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paddle Payment Modal */}
      {payModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  P
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Paddle Billing Gateway</h3>
                  <p className="text-[11px] text-slate-500">Invoice: {payModalPayment.transaction_id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayModalPayment(null);
                  setPaymentSuccessData(null);
                  setPayError('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {paymentSuccessData ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 text-3xl">
                  <BiCheckCircle />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900">Payment Completed!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your payment of ${(Number(payModalPayment.amount_in_cents || 0) / 100).toFixed(2)} {payModalPayment.currency || 'USD'} has been confirmed via Paddle. Your subscription is now <strong className="text-emerald-600 font-bold">ACTIVE</strong>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Package:</span>
                    <strong className="text-slate-900">{payModalPayment.package_name || 'Portfolio Package'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">ACTIVE</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <Link
                    href="/workspace"
                    onClick={() => setPayModalPayment(null)}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <BiWorld className="text-base" />
                    <span>Manage Websites in Workspace →</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setPayModalPayment(null);
                      setPaymentSuccessData(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {payError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <BiErrorCircle className="text-base shrink-0" />
                    <span>{payError}</span>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Package Name:</span>
                    <strong className="text-slate-900 font-semibold">{payModalPayment.package_name || 'Portfolio Package'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Invoice Ref:</span>
                    <span className="font-mono text-slate-700">{payModalPayment.transaction_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Payee:</span>
                    <span className="text-slate-800">{creator?.name} ({creator?.email})</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">Total Due:</span>
                    <div className="text-xl font-black text-indigo-600 font-mono">
                      ${(Number(payModalPayment.amount_in_cents || 0) / 100).toFixed(2)}{' '}
                      <span className="text-xs text-slate-400 font-normal">{payModalPayment.currency || 'USD'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 text-[11px] text-indigo-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <BiCheckShield className="text-sm" />
                    <span>Paddle Billing Gateway</span>
                  </div>
                  <p>
                    Clicking &quot;View Invoice & Settle Payment&quot; will authorize and execute payment for this invoice, immediately activating your package subscription quota.
                  </p>
                </div>

                <Link
                  href={`/creator/${creator.id}/payments/${payModalPayment.id}`}
                  className="w-full py-3.5 rounded-2xl bg-secondary hover:bg-secondary-dark active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-secondary/30 transition-all flex items-center justify-center gap-2 text-center"
                >
                  <BiCreditCard className="text-base" />
                  <span>View Invoice & Settle Payment &rarr;</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {selectedInvoice && (() => {
        const invData = generateInvoiceData(selectedInvoice, creator);
        const isPaid = ['completed', 'successful'].includes(selectedInvoice.status?.toLowerCase()) || Boolean(selectedInvoice.isPaid);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                    <BiReceipt className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Official Invoice Receipt</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Invoice #{invData.invoiceNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <BiX className="text-xl" />
                </button>
              </div>

              {/* Printable receipt card */}
              <div id="printable-receipt-modal" className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
                {/* 1. Company Data (Top) */}
                <div className="flex justify-between items-start pb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{invData.issuer.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{invData.issuer.email} &bull; {invData.issuer.phone}</p>
                    <p className="text-xs text-slate-400">{invData.issuer.address}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isPaid ? 'PAID' : 'UNPAID'}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400">Official Receipt</div>
                  </div>
                </div>

                {/* 2. Invoice Data & 3. Creator Data */}
                <div className="grid grid-cols-2 gap-6 text-xs pb-5 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Invoice Information
                    </span>
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-20">Number:</span>
                      <span className="font-mono font-bold text-slate-800">{invData.invoiceNumber}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-20">Date:</span>
                      <span className="font-semibold text-slate-800">{invData.date}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Creator Information
                    </span>
                    <div className="font-bold text-slate-900">{invData.customer.name}</div>
                    <div className="text-slate-500">{invData.customer.email}</div>
                    {invData.customer.id && (
                      <div className="text-slate-400 text-[11px]">Creator ID: #{invData.customer.id}</div>
                    )}
                  </div>
                </div>

                {/* 4. Package Data */}
                <div className="space-y-2 pb-5 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Package & Plan Details
                  </span>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="pb-2">Package</th>
                        <th className="pb-2 text-center">Interval</th>
                        <th className="pb-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900">{invData.item.packageName}</div>
                          <div className="text-[11px] text-slate-500">{invData.item.description}</div>
                        </td>
                        <td className="py-2.5 text-center capitalize text-slate-600 font-medium">
                          {invData.item.billingInterval.toLowerCase()}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          ${invData.pricing.totalUsd} {invData.pricing.currency}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. Payment Data & Summary Total */}
                <div className="flex justify-between items-start text-xs pt-1">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Payment Information
                    </span>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-400">Method:</span>
                      <span className="font-semibold text-slate-800 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100">
                        {invData.paymentMethod}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-400">Status:</span>
                      <span className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {invData.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-slate-400 text-xs">Total Amount:</span>
                    <div className="text-2xl font-black text-slate-900 font-mono">
                      ${invData.pricing.totalUsd} <span className="text-xs font-normal text-slate-400">{invData.pricing.currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="space-y-2 pt-1 no-print">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => printReceipt(selectedInvoice, creator)}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <BiDownload className="text-base" />
                    <span>Download / Print PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReceiptFile(selectedInvoice, creator)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BiFile className="text-base text-slate-500" />
                    <span>Save HTML Receipt</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  {!isPaid ? (
                    <Link
                      href={`/creator/${creator.id}/payments/${selectedInvoice.id}`}
                      onClick={() => setSelectedInvoice(null)}
                      className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center"
                    >
                      <span>View Invoice & Pay with bKash / Card &rarr;</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/creator/${creator.id}/payments/${selectedInvoice.id}`}
                      onClick={() => setSelectedInvoice(null)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold text-center transition-colors"
                    >
                      View Full Invoice Page &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function CreatorPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <BiLoaderAlt className="animate-spin text-3xl text-indigo-600" />
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}

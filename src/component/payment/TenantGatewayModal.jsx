'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const GATEWAY_DISPLAY = {
  bkash: {
    name: 'bKash',
    desc: 'Instant MFS mobile payment',
    badge: 'Mobile Banking',
    bgColor: 'bg-pink-50 border-pink-200 text-pink-700',
    selectedRing: 'ring-pink-500 border-pink-500'
  },
  eps: {
    name: 'EPS (Easy Payment System)',
    desc: 'Bank accounts & local cards',
    badge: 'Internet Banking',
    bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    selectedRing: 'ring-emerald-500 border-emerald-500'
  },
  sslcommerz: {
    name: 'SSLCommerz',
    desc: 'All debit/credit cards & wallets',
    badge: 'All-in-One PG',
    bgColor: 'bg-blue-50 border-blue-200 text-blue-700',
    selectedRing: 'ring-blue-500 border-blue-500'
  },
  surjopay: {
    name: 'shurjoPay',
    desc: 'Bangladeshi cards & mobile banking',
    badge: 'Aggregator',
    bgColor: 'bg-orange-50 border-orange-200 text-orange-700',
    selectedRing: 'ring-orange-500 border-orange-500'
  },
  sonali_gateway: {
    name: 'Sonali Bank e-Payment',
    desc: 'Treasury & government educational portal',
    badge: 'Treasury SPG',
    bgColor: 'bg-amber-50 border-amber-200 text-amber-700',
    selectedRing: 'ring-amber-500 border-amber-500'
  },
  stripe: {
    name: 'Stripe International',
    desc: 'Global credit & debit cards',
    badge: 'Global Cards',
    bgColor: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    selectedRing: 'ring-indigo-500 border-indigo-500'
  },
  paypal: {
    name: 'PayPal Platform',
    desc: 'PayPal wallet & USD checkout',
    badge: 'International Wallet',
    bgColor: 'bg-sky-50 border-sky-200 text-sky-700',
    selectedRing: 'ring-sky-500 border-sky-500'
  },
  paddle: {
    name: 'Paddle Billing',
    desc: 'Global tax-compliant card checkout',
    badge: 'Tax Compliant',
    bgColor: 'bg-teal-50 border-teal-200 text-teal-700',
    selectedRing: 'ring-teal-500 border-teal-500'
  }
};

export default function TenantGatewayModal({
  isOpen,
  onClose,
  invoice,
  domain = '',
  purpose = 'education_fees',
  availableGateways = [],
  onPaymentSuccess
}) {
  const router = useRouter();

  const [selectedGateway, setSelectedGateway] = useState('bkash');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (invoice) {
      if (invoice.student_name || invoice.applicant_name) {
        setPayerName(invoice.student_name || invoice.applicant_name);
      }
      if (invoice.email) {
        setPayerEmail(invoice.email);
      }
      if (invoice.phone || invoice.mobile) {
        setPayerPhone(invoice.phone || invoice.mobile);
      }
    }
  }, [invoice]);

  useEffect(() => {
    if (availableGateways && availableGateways.length > 0) {
      const firstCode = availableGateways[0]?.code || availableGateways[0]?.gateway_code || 'bkash';
      setSelectedGateway(firstCode);
    }
  }, [availableGateways]);

  if (!isOpen || !invoice) return null;

  const dueAmount = Number(invoice.net_due || invoice.amount || 0).toFixed(2);
  const currency = invoice.currency || 'BDT';
  const currencySymbol = currency === 'BDT' ? '৳' : (currency === 'USD' ? '$' : currency);

  const displayedGateways = (availableGateways && availableGateways.length > 0)
    ? availableGateways.map(g => ({
        code: g.code || g.gateway_code,
        name: g.name || g.account_name || g.code
      }))
    : [
        { code: 'bkash', name: 'bKash' },
        { code: 'eps', name: 'EPS' },
        { code: 'sslcommerz', name: 'SSLCommerz' },
        { code: 'surjopay', name: 'shurjoPay' },
        { code: 'sonali_gateway', name: 'Sonali Bank' },
        { code: 'stripe', name: 'Stripe' },
        { code: 'paypal', name: 'PayPal' },
        { code: 'paddle', name: 'Paddle' }
      ];

  const handlePayNow = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const payload = {
        purpose: purpose || invoice.purpose || 'education_fees',
        invoiceRef: invoice.invoice_ref || invoice.tracking_number || invoice.id,
        studentId: invoice.student_id || null,
        hostelId: invoice.hostel_id || null,
        amount: Number(dueAmount),
        currency,
        payerName: payerName.trim() || 'Student / Guardian',
        payerEmail: payerEmail.trim() || undefined,
        payerPhone: payerPhone.trim() || undefined,
        preferredGateway: selectedGateway
      };

      const endpoint = domain ? `/api/${domain}/pay/process` : '/api/pay/process';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment gateway initialization failed.');
      }

      if (data.checkoutUrl) {
        if (data.checkoutUrl.includes('status=simulated') || data.checkoutUrl.includes('status=simulated_ready')) {
          setSuccessData({
            transactionId: data.transactionRecordId || `SIM-TX-${Date.now()}`,
            amount: dueAmount,
            currency,
            gateway: selectedGateway
          });
          if (onPaymentSuccess) {
            onPaymentSuccess(data);
          }
        } else {
          window.location.href = data.checkoutUrl;
        }
      } else {
        setSuccessData(data);
        if (onPaymentSuccess) {
          onPaymentSuccess(data);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
              {currencySymbol}
            </div>
            <div>
              <h3 className="text-lg font-bold">Secure Fee Checkout</h3>
              <p className="text-xs text-slate-400">Institutional Multi-Gateway Settlement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {successData ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h4 className="text-xl font-bold text-slate-800">Payment Successfully Recorded</h4>
            <p className="text-sm text-slate-600">
              Transaction ID: <span className="font-mono font-semibold text-slate-900">{successData.transactionId}</span>
            </p>
            <div className="p-4 bg-slate-50 rounded-xl text-left text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-emerald-600">{currencySymbol} {dueAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway Channel:</span>
                <span className="font-semibold text-slate-800 uppercase">{selectedGateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Reference:</span>
                <span className="font-mono text-slate-800">{invoice.invoice_ref || invoice.id}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handlePayNow} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  {invoice.title || invoice.purpose_label || 'Payable Fee'}
                </span>
                <div className="text-sm font-bold text-slate-800">
                  Ref: {invoice.invoice_ref || invoice.tracking_number || invoice.id}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Total Payable</span>
                <div className="text-2xl font-black text-emerald-600">
                  {currencySymbol} {dueAmount}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Select Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {displayedGateways.map((gw) => {
                  const meta = GATEWAY_DISPLAY[gw.code] || {
                    name: gw.name || gw.code,
                    desc: 'Online payment',
                    badge: 'Gateway',
                    bgColor: 'bg-slate-50 border-slate-200 text-slate-700',
                    selectedRing: 'ring-emerald-500 border-emerald-500'
                  };
                  const isSelected = selectedGateway === gw.code;
                  return (
                    <button
                      key={gw.code}
                      type="button"
                      onClick={() => setSelectedGateway(gw.code)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? `ring-2 ${meta.selectedRing} bg-white shadow-sm`
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{meta.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bgColor}`}>
                          {meta.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{meta.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Payer Information</h4>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="payerName">
                  Payer Name
                </label>
                <input
                  id="payerName"
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  aria-label="Payer Full Name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="payerPhone">
                    Phone / Mobile
                  </label>
                  <input
                    id="payerPhone"
                    type="tel"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    aria-label="Payer Phone Number"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="payerEmail">
                    Email Address
                  </label>
                  <input
                    id="payerEmail"
                    type="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    aria-label="Payer Email Address"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connecting to Gateway...</span>
                  </>
                ) : (
                  <span>Proceed to Pay {currencySymbol} {dueAmount}</span>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                256-bit encrypted merchant checkout. No credentials saved on local device.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import {
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiLock,
  FiDollarSign,
  FiSmartphone,
  FiShield,
  FiHelpCircle
} from 'react-icons/fi';

export default function AdmissionPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const domain = params?.domain || '';
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Gateway Form State
  const [selectedMethod, setSelectedMethod] = useState('bkash'); // 'bkash' | 'nagad' | 'rocket' | 'card'
  const [walletNumber, setWalletNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const paymentApi = getApiEndpoint
    ? getApiEndpoint('admissions/payment')
    : (domain ? `/api/${domain}/admissions/payment` : '/api/admissions/payment');

  useEffect(() => {
    if (!id) return;

    const fetchPaymentDetails = async () => {
      try {
        const res = await fetch(`${paymentApi}?applicant_id=${id}`);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.applicant) {
          setApplicant(data.applicant);
          if (data.applicant.payment_status === 'paid') {
            setPaymentDone(true);
          }
          if (data.applicant.phone) {
            setWalletNumber(data.applicant.phone);
          }
        } else {
          toast.error(data.error || 'Failed to load candidate invoice.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error loading payment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [id, paymentApi]);

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setPaying(true);

    try {
      const payload = {
        applicant_id: parseInt(id, 10),
        gateway_code: selectedMethod,
        transaction_id: transactionId.trim() || `TXN-${selectedMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        account_number: selectedMethod === 'card' ? cardNumber : walletNumber
      };

      const res = await fetch(paymentApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Payment completed successfully!');
        setPaymentDone(true);
        setTimeout(() => {
          router.push(`/admission/upload/${id}`);
        }, 1500);
      } else {
        toast.error(data.error || 'Payment transaction failed.');
      }
    } catch {
      toast.error('Payment processing failed due to network error.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <div className="loader loader-md" />
        <span className="text-xs text-slate-500 font-medium">Securing payment gateway connection...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <FiAlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900 dark:text-white">Invoice Not Found</h3>
        <p className="text-xs text-slate-500">
          The requested candidate application invoice does not exist or has expired.
        </p>
        <Link
          href="/admission"
          className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded"
        >
          Return to Admission Portal
        </Link>
      </div>
    );
  }

  if (paymentDone) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800/60 shadow-lg text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
          <FiCheckCircle />
        </div>
        <div>
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded uppercase tracking-wider">
            Fee Settled & Confirmed
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
            Payment Completed Successfully
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Application fee for <strong>{applicant.applicant_name}</strong> (App No: <code className="font-mono">{applicant.application_no}</code>) is fully paid.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice:</span>
            <span className="font-mono font-semibold">{applicant.invoice_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="font-mono font-bold text-emerald-600">৳{applicant.amount} {applicant.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-semibold text-emerald-600 uppercase">PAID</span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/admission/upload/${applicant.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <span>Proceed to Upload Photo & Signature</span>
            <FiArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header banner */}
      <div className="text-center space-y-1.5">
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 px-3 py-1 rounded-full uppercase tracking-wider">
          Secure Payment Gateway
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Pay Admission Application Fee
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Complete the official intake fee to unlock photo & signature verification for admit card generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Invoice summary */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Application Summary
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {applicant.applicant_name}
            </h3>
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
              {applicant.application_no}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Circular</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{applicant.circular_title}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Target Class</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{applicant.class_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Session</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{applicant.session_name || 'N/A'}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-medium block">Total Payable</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ৳{applicant.amount}
              </span>
              <span className="text-xs font-semibold text-slate-500">{applicant.currency}</span>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40 flex items-start gap-2 text-[11px] text-blue-800 dark:text-blue-300">
            <FiShield className="shrink-0 text-sm mt-0.5 text-blue-600" />
            <span>256-Bit SSL Encrypted End-to-End Institutional Payment Tunnel</span>
          </div>
        </div>

        {/* Right Column: Gateway Selection & Action Form */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2.5">
              Select Payment Method
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* bKash */}
              <button
                type="button"
                onClick={() => setSelectedMethod('bkash')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  selectedMethod === 'bkash'
                    ? 'border-[#D12053] bg-[#D12053]/5 dark:bg-[#D12053]/15 text-[#D12053] font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-xs font-extrabold tracking-wide">bKash</span>
                <span className="text-[9px] opacity-75 font-normal">MFS Account</span>
              </button>

              {/* Nagad */}
              <button
                type="button"
                onClick={() => setSelectedMethod('nagad')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  selectedMethod === 'nagad'
                    ? 'border-[#E84118] bg-[#E84118]/5 dark:bg-[#E84118]/15 text-[#E84118] font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-xs font-extrabold tracking-wide">Nagad</span>
                <span className="text-[9px] opacity-75 font-normal">Postal MFS</span>
              </button>

              {/* Rocket */}
              <button
                type="button"
                onClick={() => setSelectedMethod('rocket')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  selectedMethod === 'rocket'
                    ? 'border-[#8C14FC] bg-[#8C14FC]/5 dark:bg-[#8C14FC]/15 text-[#8C14FC] font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-xs font-extrabold tracking-wide">Rocket</span>
                <span className="text-[9px] opacity-75 font-normal">DBBL Bank</span>
              </button>

              {/* Card / Bank */}
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  selectedMethod === 'card'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-xs font-extrabold tracking-wide">Cards / Net</span>
                <span className="text-[9px] opacity-75 font-normal">Debit / Credit</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleProcessPayment} className="space-y-4">
            {selectedMethod !== 'card' ? (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <FiSmartphone className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {selectedMethod.toUpperCase()} Mobile Banking Gateway
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {selectedMethod.toUpperCase()} Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction ID / TrxID (Leave blank for instant simulation)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9J47X6KD or automatic generated"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    For manual or test clearance, clicking Confirm Payment will automatically generate a verified reference.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <FiCreditCard className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Card & Internet Banking Gateway
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      placeholder="***"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={paying}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {paying ? (
                <>
                  <div className="loader loader-xs loader-white" />
                  <span>Processing Payment Authorization...</span>
                </>
              ) : (
                <>
                  <FiLock className="text-sm" />
                  <span>Confirm & Pay ৳{applicant.amount} {applicant.currency}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

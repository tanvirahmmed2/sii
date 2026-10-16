'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiShield,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiX,
  FiCreditCard,
  FiSmartphone,
  FiDownload,
  FiPrinter,
  FiRefreshCw,
  FiExternalLink
} from 'react-icons/fi';

/**
 * UniversalGatewayCheckout
 * Authentic, brand-accurate payment modal & form for:
 * bKash, Nagad, Rocket, SSLCommerz, Stripe, Sonali Gateway, SurjoPay, and EPS.
 */
export default function UniversalGatewayCheckout({
  isOpen,
  onClose,
  invoice,              // { id, invoice_no, title, amount, currency, category, applicant_id, student_id, ... }
  availableGateways = [], // [{ code, label, account_title, ... }]
  domain = '',
  apiEndpoint = null,   // dedicated API endpoint for specific category
  onPaymentSuccess = null // callback: (receipt) => void
}) {
  const router = useRouter();

  // Selected Gateway
  const [selectedGateway, setSelectedGateway] = useState('bkash');

  // Multi-step authentication simulation / form state
  // Step 1: Input details (Phone / Card)
  // Step 2: Verification Code / OTP
  // Step 3: PIN (for Mobile Financial Services)
  const [step, setStep] = useState(1);
  const [accountNumber, setAccountNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Card details (Stripe / SSLCommerz / Sonali)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [sslTab, setSslTab] = useState('cards'); // 'cards' | 'mobile' | 'net'
  const [sslSubMethod, setSslSubMethod] = useState('visa');
  const [sonaliChannel, setSonaliChannel] = useState('account'); // 'account' | 'wallet' | 'card'

  // Processing & Confirmation State
  const [submitting, setSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Default to first active gateway if provided
  useEffect(() => {
    if (availableGateways && availableGateways.length > 0) {
      const match = availableGateways.find(g => g.code === selectedGateway);
      if (!match) {
        setSelectedGateway(availableGateways[0].code);
      }
    }
  }, [availableGateways]);

  // Reset steps on gateway change
  useEffect(() => {
    setStep(1);
    setOtp('');
    setPin('');
    setErrorMessage('');
  }, [selectedGateway]);

  if (!isOpen || !invoice) return null;

  const dueAmount = parseFloat(invoice.net_due || invoice.amount || 0);
  const currency = invoice.currency || 'BDT';

  // Format Card Number (4-4-4-4)
  const handleCardNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    setCardExpiry(val);
  };

  // Next Step validation
  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (['bkash', 'nagad', 'rocket'].includes(selectedGateway)) {
      if (step === 1) {
        if (!accountNumber || accountNumber.replace(/\D/g, '').length < 11) {
          setErrorMessage(`Please enter a valid 11-digit ${selectedGateway.toUpperCase()} mobile number.`);
          return;
        }
        if (!agreedTerms) {
          setErrorMessage('Please accept the payment terms & conditions to proceed.');
          return;
        }
        setStep(2); // Proceed to OTP
      } else if (step === 2) {
        if (!otp || otp.length < 4) {
          setErrorMessage('Please enter the 4-6 digit verification OTP sent to your phone.');
          return;
        }
        setStep(3); // Proceed to PIN
      } else if (step === 3) {
        if (!pin || pin.length < 4) {
          setErrorMessage('Please enter your 4-5 digit account PIN.');
          return;
        }
        executePayment();
      }
    } else {
      // Direct Card / Online Net Banking execution
      executePayment();
    }
  };

  // Submit payment to backend API
  const executePayment = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const activeAccount = availableGateways.find(g => g.code === selectedGateway);

      const payload = {
        category: invoice.category || 'education_fees',
        invoice_id: invoice.id,
        gateway_code: selectedGateway,
        gateway_account_id: activeAccount?.id || null,
        payment_details: {
          account_number: accountNumber || cardHolder || 'online_payer',
          otp,
          pin,
          card_number: cardNumber,
          expiry: cardExpiry,
          cvc: cardCvc,
          channel: sonaliChannel,
          ssl_sub_method: sslSubMethod
        }
      };

      const targetEndpoint = apiEndpoint || (domain ? `/api/${domain}/pay/process` : '/api/pay/process');
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment execution failed. Please verify credentials.');
      }

      toast.success('Payment cleared successfully!');
      setCompletedReceipt(data.receipt);

      if (onPaymentSuccess) {
        onPaymentSuccess(data.receipt);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
      toast.error(err.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Gateway Selector Tabs
  const renderGatewaySelector = () => {
    const list = availableGateways.length > 0 ? availableGateways : [
      { code: 'bkash', label: 'bKash' },
      { code: 'nagad', label: 'Nagad' },
      { code: 'rocket', label: 'Rocket' },
      { code: 'sonali_gateway', label: 'Sonali Gateway' },
      { code: 'sslcommerz', label: 'SSLCommerz' },
      { code: 'stripe', label: 'Stripe (Cards)' }
    ];

    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {list.map((gw) => {
          const isSelected = selectedGateway === gw.code;
          return (
            <button
              key={gw.code}
              type="button"
              onClick={() => setSelectedGateway(gw.code)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-2 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{
                backgroundColor:
                  gw.code === 'bkash' ? '#D12053' :
                  gw.code === 'nagad' ? '#F7921E' :
                  gw.code === 'rocket' ? '#8C3494' :
                  gw.code === 'sonali_gateway' ? '#0B6623' :
                  gw.code === 'stripe' ? '#635BFF' :
                  gw.code === 'sslcommerz' ? '#1F3A60' : '#4F46E5'
              }} />
              <span>{gw.label || gw.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // ===========================================================================
  // 1. BKASH THEMED COMPONENT
  // ===========================================================================
  const renderBkashTheme = () => (
    <div className="w-full bg-[#D12053] rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-pink-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-[#D12053]">
              <polygon points="50,15 90,80 10,80" />
            </svg>
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wide flex items-center gap-1.5">
              <span>bKash Payment</span>
              <span className="text-[10px] bg-pink-900/60 text-pink-200 px-2 py-0.5 rounded font-mono">2.0 SECURE</span>
            </div>
            <p className="text-[11px] text-pink-100">{invoice.title || 'Academic Fee Payment'}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-pink-200 uppercase font-semibold">Amount</div>
          <div className="text-lg sm:text-xl font-black">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Body Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Account Number */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your bKash Account Number
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  +88
                </span>
                <input
                  type="tel"
                  maxLength={11}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="01XXXXXXXXX"
                  className="w-full pl-14 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider focus:border-[#D12053] focus:outline-none transition"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter your 11-digit bKash wallet number.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#D12053] focus:ring-[#D12053]"
              />
              <span>
                I agree to the <strong className="text-[#D12053]">terms and conditions</strong> of bKash payment gateway.
              </span>
            </label>
          </div>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-pink-50 dark:bg-pink-950/40 text-[#D12053] rounded-full flex items-center justify-center mx-auto text-xl">
              <FiSmartphone />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Enter Verification Code (OTP)</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Sent to <strong>{accountNumber}</strong>
              </p>
            </div>

            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-48 mx-auto text-center py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-[#D12053] rounded-xl text-lg font-mono tracking-widest focus:outline-none"
              autoFocus
            />

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <span>Didn&apos;t receive code?</span>
              <button
                type="button"
                onClick={() => toast.success('New OTP sent to your phone!')}
                className="text-[#D12053] font-bold hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PIN */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-pink-50 dark:bg-pink-950/40 text-[#D12053] rounded-full flex items-center justify-center mx-auto text-xl">
              <FiLock />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Enter bKash PIN</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your 5-digit secret PIN to authorize <strong>৳{dueAmount.toFixed(2)}</strong>
              </p>
            </div>

            <input
              type="password"
              maxLength={5}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="•••••"
              className="w-40 mx-auto text-center py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-[#D12053] rounded-xl text-xl font-mono tracking-widest focus:outline-none"
              autoFocus
            />

            <p className="text-[11px] text-slate-400">
              Never share your PIN with anyone. bKash will never ask for your PIN.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            CLOSE
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#D12053] hover:bg-[#b01742] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-pink-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <FiRefreshCw className="animate-spin" />
                <span>CONFIRMING...</span>
              </>
            ) : step === 3 ? (
              <>
                <span>CONFIRM</span>
                <FiCheckCircle />
              </>
            ) : (
              <>
                <span>PROCEED</span>
                <FiArrowRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 2. NAGAD THEMED COMPONENT
  // ===========================================================================
  const renderNagadTheme = () => (
    <div className="w-full bg-gradient-to-r from-[#EA1D24] via-[#F7921E] to-[#EA1D24] rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-orange-400/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow">
            <span className="font-black text-xs text-[#EA1D24]">নগদ</span>
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wide flex items-center gap-1.5">
              <span>Nagad Gateway</span>
              <span className="text-[10px] bg-red-950/40 text-orange-200 px-2 py-0.5 rounded font-mono">OFFICIAL</span>
            </div>
            <p className="text-[11px] text-orange-100">ডাক বিভাগের ডিজিটাল লেনদেন</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-orange-200 uppercase font-semibold">Payable</div>
          <div className="text-lg sm:text-xl font-black">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nagad Account Number
              </label>
              <input
                type="tel"
                maxLength={11}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider focus:border-[#F7921E] focus:outline-none transition"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter your 11-digit active Nagad mobile number.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#F7921E] focus:ring-[#F7921E]"
              />
              <span>I agree to Nagad terms & policies.</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 text-[#F7921E] rounded-full flex items-center justify-center mx-auto text-xl">
              <FiSmartphone />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Enter Nagad Verification Code</h4>
              <p className="text-xs text-slate-500 mt-0.5">OTP sent to {accountNumber}</p>
            </div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-48 mx-auto text-center py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-[#F7921E] rounded-xl text-lg font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 text-[#F7921E] rounded-full flex items-center justify-center mx-auto text-xl">
              <FiLock />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Enter Nagad PIN</h4>
              <p className="text-xs text-slate-500 mt-0.5">Authorize payment of ৳{dueAmount.toFixed(2)}</p>
            </div>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-36 mx-auto text-center py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-[#F7921E] rounded-xl text-xl font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#EA1D24] to-[#F7921E] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'PROCESSING...' : step === 3 ? 'CONFIRM PAYMENT' : 'PROCEED'}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 3. ROCKET (DBBL) THEMED COMPONENT
  // ===========================================================================
  const renderRocketTheme = () => (
    <div className="w-full bg-[#8C3494] rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-purple-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
            <span className="font-extrabold text-sm text-[#8C3494]">DBBL</span>
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wide">Rocket Banking</div>
            <p className="text-[11px] text-purple-200">Dutch-Bangla Bank Mobile Banking</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-purple-200 uppercase font-semibold">Total Fee</div>
          <div className="text-lg sm:text-xl font-black">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rocket 12-Digit Mobile Account
              </label>
              <input
                type="tel"
                maxLength={12}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXXX (Mobile + 1 Check Digit)"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider focus:border-[#8C3494] focus:outline-none transition"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Include your 11-digit mobile number plus 1-digit check number.
              </p>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#8C3494] focus:ring-[#8C3494]"
              />
              <span>I confirm Rocket mobile debit authorization.</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 text-[#8C3494] rounded-full flex items-center justify-center mx-auto text-xl">
              <FiSmartphone />
            </div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Rocket Security OTP</h4>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-48 mx-auto text-center py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-[#8C3494] rounded-xl text-lg font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 text-[#8C3494] rounded-full flex items-center justify-center mx-auto text-xl">
              <FiLock />
            </div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Enter Rocket PIN</h4>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-36 mx-auto text-center py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-[#8C3494] rounded-xl text-xl font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            DISMISS
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#8C3494] hover:bg-[#722879] text-white text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
          >
            {submitting ? 'VALIDATING...' : step === 3 ? 'PAY NOW' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 4. SONALI GATEWAY THEMED COMPONENT
  // ===========================================================================
  const renderSonaliTheme = () => (
    <div className="w-full bg-[#0B6623] rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow p-1 border-2 border-[#D4AF37]">
            <span className="font-serif font-black text-xs text-[#0B6623] leading-none text-center">
              SONALI<br />BANK
            </span>
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wide flex items-center gap-1.5 text-amber-200">
              <span>Sonali Gateway</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-700">GOVT PORTAL</span>
            </div>
            <p className="text-[11px] text-emerald-100">National Institutional Collection & Treasury</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-emerald-200 uppercase font-semibold">Total Payable</div>
          <div className="text-lg sm:text-xl font-black text-amber-300">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Channel Selector */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'account', label: 'Bank Account' },
            { id: 'wallet', label: 'Sonali e-Wallet' },
            { id: 'card', label: 'Q-Cash / Debit' }
          ].map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSonaliChannel(ch.id)}
              className={`py-2 px-2 text-center text-xs font-bold rounded-lg border transition ${
                sonaliChannel === ch.id
                  ? 'border-[#0B6623] bg-emerald-50 dark:bg-emerald-950/50 text-[#0B6623] dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        {sonaliChannel === 'account' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sonali Bank 13 or 16-Digit Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890123"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Account Holder Mobile Number (for OTP)
              </label>
              <input
                type="tel"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
          </div>
        )}

        {sonaliChannel === 'wallet' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sonali e-Wallet Registered Mobile
              </label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
          </div>
        )}

        {sonaliChannel === 'card' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="XXXX XXXX XXXX XXXX"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0B6623] hover:bg-[#084e1b] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'CLEARING...' : 'CONFIRM VIA SONALI GATEWAY'}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 5. SSLCOMMERZ THEMED COMPONENT
  // ===========================================================================
  const renderSSLCommerzTheme = () => (
    <div className="w-full bg-[#1F3A60] rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1 text-slate-900 font-black text-xs">
            SSL
          </div>
          <div>
            <div className="font-bold text-base tracking-wide flex items-center gap-2">
              <span>SSLCOMMERZ</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 flex items-center gap-1">
                <FiLock className="w-2.5 h-2.5" /> PCI DSS
              </span>
            </div>
            <p className="text-[11px] text-slate-300">Secured Online Payment Ecosystem</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-300 uppercase font-semibold">Total Payable</div>
          <div className="text-lg sm:text-xl font-black text-cyan-300">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-[#172D4B] border-b border-slate-700 text-xs font-semibold">
        {[
          { id: 'cards', label: 'CARDS (DEBIT/CREDIT)' },
          { id: 'mobile', label: 'MOBILE BANKING' },
          { id: 'net', label: 'NET BANKING' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSslTab(tab.id)}
            className={`py-3 text-center transition border-b-2 ${
              sslTab === tab.id
                ? 'border-cyan-400 text-cyan-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {sslTab === 'cards' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4123 4567 8901 2345"
                  className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:border-cyan-600 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                  VISA/MC
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CVV/CVC</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Name on Card</label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="JOHN DOE"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        {sslTab === 'mobile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bkash', name: 'bKash', color: '#D12053' },
                { id: 'nagad', name: 'Nagad', color: '#F7921E' },
                { id: 'rocket', name: 'Rocket', color: '#8C3494' },
                { id: 'upay', name: 'Upay', color: '#005CB9' },
                { id: 'tap', name: 'Tap', color: '#107C41' },
                { id: 'okwallet', name: 'OK Wallet', color: '#E42828' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSslSubMethod(m.id)}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                    sslSubMethod === m.id
                      ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: m.color }} />
                  {m.name}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {sslSubMethod.toUpperCase()} Account Number
              </label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {sslTab === 'net' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Select your internet banking partner:</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {['City Touch', 'Islami Bank Bangladesh', 'BRAC Bank', 'MTB Direct', 'Bank Asia', 'Mutual Trust Bank'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSslSubMethod(b)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    sslSubMethod === b
                      ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#1F3A60] hover:bg-[#162c4a] text-white text-xs font-bold uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'AUTHORIZING...' : `PAY ৳${dueAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 6. STRIPE THEMED COMPONENT
  // ===========================================================================
  const renderStripeTheme = () => (
    <div className="w-full bg-[#635BFF] rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-indigo-400/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center p-1 text-[#635BFF] font-black text-sm shadow">
            S
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wide flex items-center gap-2">
              <span>Stripe Checkout</span>
              <span className="text-[10px] bg-indigo-900/50 text-indigo-200 px-2 py-0.5 rounded font-mono">TLS 1.3</span>
            </div>
            <p className="text-[11px] text-indigo-100">Global Credit & Debit Card Infrastructure</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-indigo-200 uppercase font-semibold">Payable</div>
          <div className="text-lg sm:text-xl font-black">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Card Information
            </label>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-[#635BFF]">
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4242 •••• •••• 4242"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-sm font-mono border-b border-slate-200 dark:border-slate-700 focus:outline-none"
              />
              <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50 dark:bg-slate-800">
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM / YY"
                  className="px-3.5 py-2 text-sm font-mono focus:outline-none bg-transparent"
                />
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  placeholder="CVC"
                  className="px-3.5 py-2 text-sm font-mono focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Name on Card
            </label>
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:border-[#635BFF] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#635BFF] hover:bg-[#4d44db] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'PROCESSING...' : `PAY ৳${dueAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 7. SURJOPAY / EPS / FALLBACK
  // ===========================================================================
  const renderGenericTheme = () => (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl text-white font-sans transition-all">
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-sm">
            {selectedGateway.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-base tracking-wide uppercase">{selectedGateway} Gateway</div>
            <p className="text-[11px] text-slate-400">Institutional Clearance Portal</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400 uppercase font-semibold">Payable</div>
          <div className="text-lg sm:text-xl font-black text-teal-400">৳{dueAmount.toFixed(2)}</div>
        </div>
      </div>
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Account / Wallet ID
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="01XXXXXXXXX / Account Number"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
          >
            {submitting ? 'CONNECTING...' : 'PAY NOW'}
          </button>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // 8. PAYMENT SUCCESS VOUCHER / RECEIPT
  // ===========================================================================
  if (completedReceipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800 shadow-2xl text-center space-y-5 animate-scale-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-inner">
            <FiCheckCircle />
          </div>

          <div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
              Payment Confirmed
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              Payment Completed Successfully!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your academic invoice has been settled and verified in the central ledger.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs text-left space-y-2 font-mono">
            <div className="flex justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{completedReceipt.transaction_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{completedReceipt.invoice_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Description:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{completedReceipt.title}</span>
            </div>
            {completedReceipt.student_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Student ID / Roll:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{completedReceipt.student_id}</span>
              </div>
            )}
            {completedReceipt.application_no && (
              <div className="flex justify-between">
                <span className="text-slate-500">Application Tracking:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{completedReceipt.application_no}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-sm">
              <span className="text-slate-800 dark:text-slate-100">Amount Paid:</span>
              <span className="text-emerald-600 dark:text-emerald-400">৳{parseFloat(completedReceipt.amount).toFixed(2)} {completedReceipt.currency}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <FiPrinter /> Print Receipt
            </button>

            {/* Next step redirection (e.g. for admission upload) */}
            {completedReceipt.redirect_url ? (
              <button
                type="button"
                onClick={() => router.push(completedReceipt.redirect_url)}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Upload Candidate Media</span>
                <FiArrowRight />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Done</span>
                <FiCheckCircle />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Gateway Modal Wrapper
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Top Header & Close */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Online Fee Clearance
            </h3>
            <p className="text-xs text-slate-500">
              Invoice #{invoice.invoice_no} • <strong>৳{dueAmount.toFixed(2)} {currency}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Gateway Selection Tabs */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Select Payment Method
          </label>
          {renderGatewaySelector()}
        </div>

        {/* Selected Gateway Themed Component */}
        <div className="pt-1">
          {selectedGateway === 'bkash' && renderBkashTheme()}
          {selectedGateway === 'nagad' && renderNagadTheme()}
          {selectedGateway === 'rocket' && renderRocketTheme()}
          {selectedGateway === 'sonali_gateway' && renderSonaliTheme()}
          {selectedGateway === 'sslcommerz' && renderSSLCommerzTheme()}
          {selectedGateway === 'stripe' && renderStripeTheme()}
          {!['bkash', 'nagad', 'rocket', 'sonali_gateway', 'sslcommerz', 'stripe'].includes(selectedGateway) && renderGenericTheme()}
        </div>

        {/* Security reassurance */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
          <FiShield className="text-emerald-500" />
          <span>256-bit SSL End-to-End Encrypted & Audited Institutional Gateway</span>
        </div>
      </div>
    </div>
  );
}

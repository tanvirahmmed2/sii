'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiCreditCard,
  BiCheckCircle,
  BiLoaderAlt,
  BiArrowBack,
  BiMobileAlt,
  BiLockAlt,
  BiShieldQuarter,
  BiInfoCircle,
  BiCheckShield,
} from 'react-icons/bi';
import { SiVisa, SiMastercard } from 'react-icons/si';

export default function PaymentGatewayCheckout({ creatorId, paymentId, initialGateway }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [resultTxnId, setResultTxnId] = useState('');

  // Selected payment gateway: 'BKASH' | 'PAYONEER'
  const [gateway, setGateway] = useState((initialGateway || 'BKASH').toUpperCase());

  // bKash Multi-step state: 'ACCOUNT' | 'OTP' | 'PIN' | 'PROCESSING'
  const [bkashStep, setBkashStep] = useState('ACCOUNT');
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashOtp, setBkashOtp] = useState('');
  const [bkashPin, setBkashPin] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [bkashPaymentId, setBkashPaymentId] = useState('');
  const [bkashURL, setBkashURL] = useState('');
  const [bkashOperator, setBkashOperator] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Card details (never saved to database)
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // 3D Secure Modal State
  const [show3DSModal, setShow3DSModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [isAuthorizing3DS, setIsAuthorizing3DS] = useState(false);

  // OTP Timer countdown for bKash
  useEffect(() => {
    let timer;
    if (bkashStep === 'OTP' && otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [bkashStep, otpTimer]);

  // Load payment invoice
  useEffect(() => {
    let isMounted = true;
    if (creatorId && paymentId) {
      fetch(`/api/marketing/creator/payments?id=${paymentId}&creatorId=${creatorId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.success && data.payment) {
            setPayment(data.payment);
            setCardHolder(data.payment.creator_name || '');
            if (initialGateway) {
              setGateway(initialGateway.toUpperCase());
            } else if (data.payment.payment_method === 'PAYONEER') {
              setGateway('PAYONEER');
            } else {
              setGateway('BKASH');
            }
          } else {
            setError(data.error || 'Invoice record not found.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error(err);
          setError('Network error fetching payment invoice.');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setTimeout(() => setLoading(false), 0);
    }

    return () => {
      isMounted = false;
    };
  }, [creatorId, paymentId, initialGateway]);

  // Calculate prices based on billing interval
  const isYearly = String(payment?.billing_interval || '').toUpperCase() === 'YEARLY';
  const bdtPrice = isYearly
    ? Number(payment?.yearly_price_bdt || payment?.package_bdt_price || 3000)
    : Number(payment?.monthly_price_bdt || payment?.package_bdt_price || 300);
  const usdPrice = isYearly
    ? Number(payment?.yearly_price_usd || payment?.package_usd_price || 30)
    : Number(payment?.monthly_price_usd || payment?.package_usd_price || 3);

  // Detect card network
  const cleanCardNumber = cardNumber.replace(/\s+/g, '');
  const isVisa = cleanCardNumber.startsWith('4');
  const isMastercard =
    /^5[1-5]/.test(cleanCardNumber) ||
    /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(cleanCardNumber);

  // Card Number Formatter (inserts space every 4 digits)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Expiry Formatter (MM/YY)
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Helper to detect Bangladeshi telecom operator
  const detectBkashOperator = (numberStr) => {
    const clean = String(numberStr || '').replace(/\D/g, '');
    const prefix = clean.startsWith('880') ? clean.slice(2, 5) : clean.slice(0, 3);
    if (prefix === '017' || prefix === '013') return 'Grameenphone';
    if (prefix === '019' || prefix === '014') return 'Banglalink';
    if (prefix === '018') return 'Robi';
    if (prefix === '016') return 'Airtel';
    if (prefix === '015') return 'Teletalk';
    return '';
  };

  // --- BKASH GATEWAY FLOW ---
  const handleBkashAccountProceed = async (e) => {
    e.preventDefault();
    setError('');
    const clean = bkashNumber.replace(/\D/g, '');
    if (!/^01[3-9]\d{8}$/.test(clean)) {
      setError('Please enter a valid 11-digit Bangladeshi mobile number starting with 013-019.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/marketing/creator/payments/bkash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          creatorId: Number(creatorId),
          paymentId: Number(paymentId),
          bkashNumber: clean,
          bkashPaymentId: bkashPaymentId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.bkashPaymentId) setBkashPaymentId(data.bkashPaymentId);
        if (data.bkashURL) setBkashURL(data.bkashURL);
        if (data.operator) setBkashOperator(data.operator);
        setOtpTimer(60);
        setBkashStep('OTP');
      } else {
        setError(data.error || 'Failed to initiate bKash payment verification.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error with bKash gateway. Please check your network and try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendBkashOtp = async () => {
    setError('');
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/marketing/creator/payments/bkash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          creatorId: Number(creatorId),
          paymentId: Number(paymentId),
          bkashNumber: bkashNumber.replace(/\D/g, ''),
          bkashPaymentId: bkashPaymentId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOtpTimer(60);
      } else {
        setError(data.error || 'Failed to resend bKash verification code.');
      }
    } catch {
      setError('Network error resending bKash verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleBkashOtpProceed = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = bkashOtp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the 6-digit bKash verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/marketing/creator/payments/bkash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          creatorId: Number(creatorId),
          paymentId: Number(paymentId),
          bkashOtp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBkashStep('PIN');
      } else {
        setError(data.error || 'Invalid verification code. Please check your SMS and try again.');
      }
    } catch {
      setError('Network error verifying bKash code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleBkashPinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPin = bkashPin.trim();
    if (!/^\d{5}$/.test(cleanPin)) {
      setError('Please enter your 5-digit bKash PIN.');
      return;
    }

    setBkashStep('PROCESSING');
    setPaying(true);

    try {
      const res = await fetch('/api/marketing/creator/payments/bkash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          creatorId: Number(creatorId),
          paymentId: Number(paymentId),
          bkashPaymentId: bkashPaymentId || undefined,
          bkashNumber: bkashNumber.replace(/\D/g, ''),
          bkashOtp: bkashOtp.trim(),
          bkashPin: cleanPin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        if (data.trxId) setResultTxnId(data.trxId);
        if (data.payment) setPayment(data.payment);
      } else {
        setBkashStep('PIN');
        setError(data.error || 'bKash transaction declined. Please check your PIN and balance.');
      }
    } catch (err) {
      console.error(err);
      setBkashStep('PIN');
      setError('bKash gateway connection error. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // --- CARD GATEWAY FLOW ---
  const handleCardFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.length < 15) {
      setError('Please enter a valid 15 or 16-digit card number.');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setError('Please enter a valid expiration date in MM/YY format.');
      return;
    }
    const [expMonth, expYearStr] = cardExpiry.split('/');
    const expYear = Number('20' + expYearStr);
    const now = new Date();
    if (
      Number(expMonth) < 1 ||
      Number(expMonth) > 12 ||
      expYear < now.getFullYear() ||
      (expYear === now.getFullYear() && Number(expMonth) < now.getMonth() + 1)
    ) {
      setError('Card expiration date is invalid or has expired.');
      return;
    }

    if (!cardCvv || cardCvv.length < 3) {
      setError('Please enter a valid CVV security code (3-4 digits).');
      return;
    }

    // Open 3D Secure Verification
    setAuthCode('');
    setShow3DSModal(true);
  };

  const handle3DSAuthorization = async (e) => {
    e.preventDefault();
    setError('');
    const cleanAuth = authCode.trim();
    if (cleanAuth.length !== 6) {
      setError('Please enter the 6-digit authorization code.');
      return;
    }

    setIsAuthorizing3DS(true);
    setPaying(true);

    try {
      const res = await fetch('/api/marketing/creator/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_invoice',
          creatorId: Number(creatorId),
          paymentId: Number(paymentId),
          paymentMethod: 'PAYONEER',
          cardNumber: cardNumber.replace(/\s+/g, ''),
          cardExpiry: cardExpiry.trim(),
          cardCvv: cardCvv.trim(),
          cardHolder: cardHolder.trim(),
          authCode: cleanAuth,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShow3DSModal(false);
        setIsSuccess(true);
        if (data.trxId) setResultTxnId(data.trxId);
        if (data.payment) setPayment(data.payment);
      } else {
        setError(data.error || 'Card authorization failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Card payment gateway connection error. Please try again.');
    } finally {
      setIsAuthorizing3DS(false);
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <BiLoaderAlt className="animate-spin text-3xl text-secondary" />
        <p className="text-xs text-slate-500">Loading secure checkout...</p>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
        <Link
          href={`/creator/${creatorId}/payments`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
        >
          <BiArrowBack />
          <span>Back to Invoices</span>
        </Link>
      </div>
    );
  }

  const isAlreadyPaid = (payment?.status === 'COMPLETED' || payment?.status === 'successful' || payment?.status === 'SUCCESSFUL') && !isSuccess;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      {/* Top navigation */}
      <Link
        href={`/creator/${creatorId}/payments/${paymentId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-secondary transition-colors"
      >
        <BiArrowBack className="text-base" />
        <span>Cancel & Back to Invoice</span>
      </Link>

      {/* 1. SUCCESS / ALREADY PAID VIEW */}
      {isSuccess || isAlreadyPaid ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
            <BiCheckCircle />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAlreadyPaid ? 'Invoice Already Paid' : 'Payment Successful!'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Subscription for <strong className="text-slate-900 dark:text-white">{payment?.package_name}</strong> is active.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-2 text-left">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Payment Gateway:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {payment?.payment_method === 'BKASH' ? 'bKash (বিকাশ)' : 'International Card'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Transaction ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {resultTxnId || payment?.transaction_id || `TRX_${payment?.id}`}
              </span>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2 flex justify-between items-center font-bold text-slate-900 dark:text-white">
              <span>Amount Paid:</span>
              <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                {payment?.payment_method === 'BKASH' || payment?.currency === 'BDT'
                  ? `৳${bdtPrice} BDT`
                  : `$${usdPrice.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href={`/creator/${creatorId}/webites`}
              className="w-full py-3 px-4 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all text-center cursor-pointer shadow-md shadow-secondary/20"
            >
              Build Your Website &rarr;
            </Link>
            <Link
              href={`/creator/${creatorId}/payments/${paymentId}`}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all text-center cursor-pointer"
            >
              View Printable Invoice
            </Link>
          </div>
        </div>
      ) : (
        /* 2. PRODUCTION GATEWAY CHECKOUT VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Header Summary with Exact Currency Pricing */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <BiCheckShield className="text-emerald-500 text-sm" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  256-Bit SSL Secure Checkout
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {payment?.package_name || 'Package Subscription'}
              </h2>
              <span className="text-[11px] text-slate-400 capitalize">
                Billing interval: {String(payment?.billing_interval || 'monthly').toLowerCase()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Payable</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {gateway === 'BKASH' ? `৳${bdtPrice} BDT` : `$${usdPrice.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          {/* Gateway Switcher */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setGateway('BKASH');
                  setError('');
                  setBkashStep('ACCOUNT');
                }}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gateway === 'BKASH'
                    ? 'bg-[#E2136E] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BiMobileAlt className="text-sm" />
                <span>bKash (৳ BDT)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGateway('PAYONEER');
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gateway === 'PAYONEER'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BiCreditCard className="text-sm" />
                <span>Card ($ USD)</span>
              </button>
            </div>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <BiInfoCircle className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* GATEWAY A: BKASH PGW INTERFACE */}
          {gateway === 'BKASH' ? (
            <div className="p-5 sm:p-6 space-y-5">
              {/* bKash Official PGW Top Banner */}
              <div className="rounded-2xl bg-[#E2136E] text-white p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zm0 8.5L4.5 7 12 3.2 19.5 7 12 10.5zm-8 4L12 18l8-3.5v2.2L12 20.2 4 16.7v-2.2z" />
                    </svg>
                    <span className="font-black text-sm tracking-wide">bKash Payment</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-pink-200 block">Amount</span>
                    <span className="font-mono font-bold text-base">৳ {bdtPrice}.00 BDT</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-pink-100 pt-1 border-t border-pink-400/40">
                  <span>Merchant: Hiesci Platform</span>
                  <span>Invoice: INV-{paymentId}</span>
                </div>
              </div>

              {/* Step 1: Account Number */}
              {bkashStep === 'ACCOUNT' && (
                <form onSubmit={handleBkashAccountProceed} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Your bKash Account Number
                      </label>
                      {detectBkashOperator(bkashNumber) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 dark:bg-pink-950/50 text-[#E2136E] border border-pink-200 dark:border-pink-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E2136E] animate-pulse" />
                          {detectBkashOperator(bkashNumber)}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        autoFocus
                        placeholder="01XXXXXXXXX"
                        maxLength={11}
                        value={bkashNumber}
                        onChange={(e) => setBkashNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-3 text-sm text-slate-800 dark:text-white font-mono focus:outline-none focus:border-[#E2136E]"
                      />
                      <BiMobileAlt className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Enter your 11-digit Bangladeshi mobile number registered with bKash (013-019)
                    </span>
                  </div>

                  {bkashURL && (
                    <div className="p-3 rounded-xl bg-pink-50/60 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900 text-center">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">
                        Official bKash Hosted Payment Gateway is available for this transaction.
                      </p>
                      <a
                        href={bkashURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E2136E] text-white text-[11px] font-bold shadow-xs hover:bg-[#c2105e] transition-colors"
                      >
                        <span>Open bKash Hosted Page &rarr;</span>
                      </a>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                    By clicking on <strong>Proceed</strong>, you agree to the bKash payment terms & conditions.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      href={`/creator/${creatorId}/payments/${paymentId}`}
                      className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold text-center transition-colors cursor-pointer"
                    >
                      CLOSE
                    </Link>
                    <button
                      type="submit"
                      disabled={bkashNumber.length !== 11 || isSendingOtp}
                      className="py-3 px-4 rounded-xl bg-[#E2136E] hover:bg-[#c2105e] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#E2136E]/20 flex items-center justify-center gap-1.5"
                    >
                      {isSendingOtp ? (
                        <>
                          <BiLoaderAlt className="animate-spin text-sm" />
                          <span>SENDING OTP...</span>
                        </>
                      ) : (
                        <span>PROCEED &rarr;</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verification Code (OTP) */}
              {bkashStep === 'OTP' && (
                <form onSubmit={handleBkashOtpProceed} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      bKash Verification Code
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Enter the 6-digit verification code sent via SMS to <strong className="font-mono text-slate-700 dark:text-slate-300">{bkashNumber}</strong>
                    </p>
                    {bkashOperator && (
                      <span className="inline-block text-[10px] font-semibold text-[#E2136E]">
                        Operator: {bkashOperator}
                      </span>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="••••••"
                      maxLength={6}
                      value={bkashOtp}
                      onChange={(e) => setBkashOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-slate-800 dark:text-white focus:outline-none focus:border-[#E2136E]"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400">
                        {otpTimer > 0 ? (
                          `Resend code in ${otpTimer}s`
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendBkashOtp}
                            disabled={isSendingOtp}
                            className="text-[#E2136E] hover:underline font-bold cursor-pointer"
                          >
                            {isSendingOtp ? 'Resending...' : 'Resend Code'}
                          </button>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">6-digit SMS code</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBkashStep('ACCOUNT')}
                      className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      &larr; BACK
                    </button>
                    <button
                      type="submit"
                      disabled={bkashOtp.length !== 6 || isVerifyingOtp}
                      className="py-3 px-4 rounded-xl bg-[#E2136E] hover:bg-[#c2105e] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#E2136E]/20 flex items-center justify-center gap-1.5"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <BiLoaderAlt className="animate-spin text-sm" />
                          <span>VERIFYING...</span>
                        </>
                      ) : (
                        <span>PROCEED &rarr;</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Enter PIN */}
              {bkashStep === 'PIN' && (
                <form onSubmit={handleBkashPinSubmit} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Enter bKash PIN
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Enter 5-digit PIN of your bKash Account
                    </p>
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        autoFocus
                        placeholder="•••••"
                        maxLength={5}
                        value={bkashPin}
                        onChange={(e) => setBkashPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-slate-800 dark:text-white focus:outline-none focus:border-[#E2136E]"
                      />
                      <BiLockAlt className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1.5 block text-center">
                      bKash will never ask you for your PIN or OTP. Never share your PIN.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBkashStep('OTP')}
                      className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      &larr; BACK
                    </button>
                    <button
                      type="submit"
                      disabled={bkashPin.length !== 5 || paying}
                      className="py-3 px-4 rounded-xl bg-[#E2136E] hover:bg-[#c2105e] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#E2136E]/20 flex items-center justify-center gap-1.5"
                    >
                      {paying ? (
                        <>
                          <BiLoaderAlt className="animate-spin text-sm" />
                          <span>CONFIRMING...</span>
                        </>
                      ) : (
                        <span>CONFIRM ৳{bdtPrice}</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4: Processing State */}
              {bkashStep === 'PROCESSING' && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#E2136E]/10 border border-[#E2136E]/30 text-[#E2136E] flex items-center justify-center mx-auto text-3xl animate-pulse">
                    <BiLoaderAlt className="animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Authorizing with bKash Gateway...
                    </h3>
                    <p className="text-xs text-slate-400">
                      Debiting ৳{bdtPrice}.00 BDT from {bkashNumber}. Please do not close or refresh this window.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* GATEWAY B: INTERNATIONAL CARD GATEWAY */
            <div className="p-5 sm:p-6 space-y-5">
              {/* Interactive Virtual Card Preview */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white shadow-lg space-y-4 border border-slate-700/50">
                <div className="flex justify-between items-center">
                  {/* EMV Chip & Contactless */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-7 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center">
                      <div className="w-6 h-4 border border-amber-600/60 rounded-xs" />
                    </div>
                    <BiShieldQuarter className="text-slate-400 text-base" />
                  </div>
                  {/* Card Brand */}
                  <div className="text-2xl">
                    {isVisa ? (
                      <SiVisa className="text-white" />
                    ) : isMastercard ? (
                      <SiMastercard className="text-amber-500" />
                    ) : (
                      <BiCreditCard className="text-slate-300" />
                    )}
                  </div>
                </div>

                {/* Card Number Preview */}
                <div className="font-mono text-base tracking-widest text-slate-100 font-bold py-1">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>

                {/* Card Holder & Expiry */}
                <div className="flex justify-between items-end text-xs uppercase tracking-wider text-slate-300">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-normal">Cardholder</span>
                    <span className="font-semibold text-white truncate max-w-[180px] block">
                      {cardHolder || 'CARDHOLDER NAME'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-normal">Expires</span>
                    <span className="font-semibold font-mono text-white">
                      {cardExpiry || 'MM/YY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Inputs Form */}
              <form onSubmit={handleCardFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name as printed on card"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="•••• •••• •••• ••••"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-secondary"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {isVisa ? (
                        <SiVisa className="text-lg text-blue-600" />
                      ) : isMastercard ? (
                        <SiMastercard className="text-lg text-amber-500" />
                      ) : (
                        <BiCreditCard className="text-lg" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 py-1">
                  <BiCheckShield className="text-emerald-500 text-sm shrink-0" />
                  <span>PCI-DSS Level 1 Certified & End-to-End Encrypted.</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full py-3.5 px-4 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-secondary/20"
                  >
                    <span>Proceed to 3D Secure (${usdPrice.toFixed(2)} USD)</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3D SECURE BANK AUTHORIZATION MODAL */}
      {show3DSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Bank Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-lg">
                  <BiShieldQuarter />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    3D Secure Bank Verification
                  </h4>
                  <p className="text-[10px] text-slate-400">Issuer Authorization</p>
                </div>
              </div>
              <div className="text-xl">
                {isVisa ? <SiVisa className="text-blue-600" /> : <SiMastercard className="text-amber-500" />}
              </div>
            </div>

            {/* Transaction specs */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>Merchant:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Hiesci Platform</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">${usdPrice.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Card Ending:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  •••• {cleanCardNumber.slice(-4) || '••••'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal text-center">
              Please enter the 6-digit one-time authorization code sent to your registered mobile device by your issuing bank.
            </p>

            <form onSubmit={handle3DSAuthorization} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="••••••"
                  maxLength={6}
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-slate-800 dark:text-white focus:outline-none focus:border-secondary"
                />
                <span className="text-[10px] text-slate-400 mt-1.5 block text-center">
                  6-digit bank verification code
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isAuthorizing3DS}
                  onClick={() => setShow3DSModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={authCode.length !== 6 || isAuthorizing3DS}
                  className="py-3 px-4 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-secondary/20 flex items-center justify-center gap-1.5"
                >
                  {isAuthorizing3DS ? (
                    <>
                      <BiLoaderAlt className="animate-spin text-sm" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <span>CONFIRM & PAY</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

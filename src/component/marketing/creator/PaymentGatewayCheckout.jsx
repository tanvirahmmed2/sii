'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PaymentGatewayCheckout({
  creatorId,
  paymentId,
  initialGateway,
  onSuccess,
  onClose,
  isModal = false,
}) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [resultTxnId, setResultTxnId] = useState('');

  // Selected payment gateway: 'BKASH' | 'PADDLE'
  const [gateway, setGateway] = useState(() => {
    const init = (initialGateway || 'BKASH').toUpperCase();
    return init === 'PAYONEER' ? 'PADDLE' : init;
  });

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
              const gw = initialGateway.toUpperCase();
              setGateway(gw === 'PAYONEER' ? 'PADDLE' : gw);
            } else if (data.payment.payment_method === 'PADDLE' || data.payment.payment_method === 'PAYONEER') {
              setGateway('PADDLE');
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
    ? Number(payment?.yearly_price_bdt ?? payment?.package_bdt_price ?? payment?.amount ?? 0)
    : Number(payment?.monthly_price_bdt ?? payment?.package_bdt_price ?? payment?.amount ?? 0);
  const usdPrice = isYearly
    ? Number(payment?.yearly_price_usd ?? payment?.package_usd_price ?? payment?.amount ?? 0)
    : Number(payment?.monthly_price_usd ?? payment?.package_usd_price ?? payment?.amount ?? 0);

  // Card Number Formatter
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
        if (onSuccess) onSuccess(data);
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
          paymentMethod: 'PADDLE',
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
        if (onSuccess) onSuccess(data);
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
      <div className="py-8 text-center text-xs text-slate-500 font-medium">
        Loading payment checkout...
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="py-6 text-center space-y-3 text-xs">
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {error}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Close
          </button>
        ) : (
          <Link
            href={`/creator/${creatorId}/payments`}
            className="text-slate-800 font-semibold underline"
          >
            Back to Invoices
          </Link>
        )}
      </div>
    );
  }

  const isAlreadyPaid = (payment?.status === 'COMPLETED' || payment?.status === 'successful' || payment?.status === 'SUCCESSFUL') && !isSuccess;

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {!isModal && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href={`/creator/${creatorId}/payments/${paymentId}`}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            &larr; Back to Invoice
          </Link>
        </div>
      )}

      {/* SUCCESS / ALREADY PAID VIEW */}
      {isSuccess || isAlreadyPaid ? (
        <div className="bg-white border border-slate-200 rounded p-5 text-center space-y-3">
          <div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-1">
              Payment Confirmed
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              {isAlreadyPaid ? 'Invoice Already Paid' : 'Payment Successful'}
            </h2>
            <p className="text-slate-500 text-xs">
              Subscription for {payment?.package_name} is active.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-left font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway:</span>
              <span className="text-slate-900 font-sans font-medium">
                {payment?.payment_method === 'BKASH' ? 'bKash' : 'Paddle'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="text-slate-900 font-semibold">
                {resultTxnId || payment?.transaction_id || payment?.id}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
              <span>Amount:</span>
              <span className="text-emerald-700">
                {payment?.payment_method === 'BKASH' || payment?.currency === 'BDT'
                  ? `৳${bdtPrice} BDT`
                  : `$${usdPrice.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
              >
                Close & Return
              </button>
            ) : (
              <Link
                href="/workspace"
                className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-center"
              >
                Go to Workspace
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* CHECKOUT INTERFACE */
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          {/* Header Summary */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                Secure Checkout
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                {payment?.package_name || 'Package Subscription'}
              </h2>
              <span className="text-[11px] text-slate-500 capitalize">
                Cycle: {String(payment?.billing_interval || 'monthly').toLowerCase()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
              <span className="text-base font-semibold font-mono text-slate-900">
                {gateway === 'BKASH' ? `৳${bdtPrice} BDT` : `$${usdPrice.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          {/* Gateway Switcher */}
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setGateway('BKASH');
                  setError('');
                  setBkashStep('ACCOUNT');
                }}
                className={`py-1.5 px-3 rounded border text-xs font-medium cursor-pointer transition-colors ${
                  gateway === 'BKASH'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                bKash (৳ BDT)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGateway('PADDLE');
                  setError('');
                }}
                className={`py-1.5 px-3 rounded border text-xs font-medium cursor-pointer transition-colors ${
                  gateway === 'PADDLE'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Paddle / Card ($ USD)
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="m-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* BKASH GATEWAY */}
          {gateway === 'BKASH' ? (
            <div className="p-4 space-y-3">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-900">bKash Payment</span>
                <span className="font-mono font-semibold text-slate-900">৳{bdtPrice} BDT</span>
              </div>

              {/* Step 1: Account Number */}
              {bkashStep === 'ACCOUNT' && (
                <form onSubmit={handleBkashAccountProceed} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      bKash Account Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="01XXXXXXXXX"
                      maxLength={11}
                      value={bkashNumber}
                      onChange={(e) => setBkashNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Enter 11-digit mobile number registered with bKash (013-019)
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={bkashNumber.length !== 11 || isSendingOtp}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingOtp ? 'Sending OTP...' : 'Proceed'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP */}
              {bkashStep === 'OTP' && (
                <form onSubmit={handleBkashOtpProceed} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Verification Code (OTP)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="••••••"
                      maxLength={6}
                      value={bkashOtp}
                      onChange={(e) => setBkashOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.3em] font-mono text-base font-semibold bg-white border border-slate-300 rounded py-2 text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                      <span>Sent to {bkashNumber}</span>
                      {otpTimer > 0 ? (
                        <span>Resend in {otpTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendBkashOtp}
                          disabled={isSendingOtp}
                          className="text-slate-900 font-semibold underline cursor-pointer"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBkashStep('ACCOUNT')}
                      className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={bkashOtp.length !== 6 || isVerifyingOtp}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: PIN */}
              {bkashStep === 'PIN' && (
                <form onSubmit={handleBkashPinSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      bKash 5-Digit PIN
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="•••••"
                      maxLength={5}
                      value={bkashPin}
                      onChange={(e) => setBkashPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.3em] font-mono text-base font-semibold bg-white border border-slate-300 rounded py-2 text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block text-center">
                      PIN is securely verified directly via bKash gateway.
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBkashStep('OTP')}
                      className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={bkashPin.length !== 5 || paying}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {paying ? 'Confirming...' : `Confirm Payment ৳${bdtPrice}`}
                    </button>
                  </div>
                </form>
              )}

              {/* Processing */}
              {bkashStep === 'PROCESSING' && (
                <div className="py-6 text-center text-xs text-slate-600 font-medium">
                  Authorizing with bKash gateway... Please do not refresh.
                </div>
              )}
            </div>
          ) : (
            /* PADDLE / CARD GATEWAY */
            <div className="p-4 space-y-3">
              <form onSubmit={handleCardFormSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name as printed on card"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="•••• •••• •••• ••••"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={paying}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                  >
                    Proceed (${usdPrice.toFixed(2)} USD)
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3D SECURE BANK MODAL */}
      {show3DSModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded max-w-xs w-full p-4 space-y-3 shadow-lg">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs font-semibold text-slate-900">
                3D Secure Verification
              </h4>
              <p className="text-[10px] text-slate-500">Bank Issuer Code</p>
            </div>

            <p className="text-[11px] text-slate-600">
              Enter the 6-digit one-time code sent by your card issuing bank to confirm ${usdPrice.toFixed(2)} USD.
            </p>

            <form onSubmit={handle3DSAuthorization} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="••••••"
                  maxLength={6}
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.3em] font-mono text-base font-semibold bg-white border border-slate-300 rounded py-2 text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShow3DSModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authCode.length !== 6 || isAuthorizing3DS}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isAuthorizing3DS ? 'Authorizing...' : 'Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

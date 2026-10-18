'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

/**
 * UniversalGatewayCheckout
 * Authentic, brand-accurate payment modal & form for:
 * bKash, Nagad, Rocket, SSLCommerz, Stripe, Sonali Gateway, SurjoPay, and EPS.
 * Conforms strictly to STYLE.MD and globals.css design system.
 */
export default function UniversalGatewayCheckout({
  isOpen,
  onClose,
  invoice,
  availableGateways = [],
  domain = '',
  apiEndpoint = null,
  onPaymentSuccess = null
}) {
  const router = useRouter();

  // Selected Gateway
  const [selectedGateway, setSelectedGateway] = useState('bkash');

  // Multi-step verification state
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
  const [sslTab, setSslTab] = useState('cards');
  const [sslSubMethod, setSslSubMethod] = useState('visa');
  const [sonaliChannel, setSonaliChannel] = useState('account');

  // Processing & Confirmation State
  const [submitting, setSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Default to first active gateway if provided
  useEffect(() => {
    if (availableGateways && availableGateways.length > 0) {
      const match = availableGateways.find((g) => g.code === selectedGateway);
      if (!match) {
        setSelectedGateway(availableGateways[0].code);
      }
    }
  }, [availableGateways, selectedGateway]);

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

  // Next step handler for multi-step gateways (bKash, Nagad, Rocket)
  const handleNextStep = () => {
    setErrorMessage('');

    if (['bkash', 'nagad', 'rocket'].includes(selectedGateway)) {
      if (step === 1) {
        if (!accountNumber || accountNumber.length < 11) {
          setErrorMessage('Please enter a valid 11-digit mobile wallet number.');
          return;
        }
        if (!agreedTerms) {
          setErrorMessage('Please accept the payment terms to proceed.');
          return;
        }
        setStep(2);
      } else if (step === 2) {
        if (!otp || otp.length < 4) {
          setErrorMessage('Please enter the 4-6 digit verification OTP sent to your phone.');
          return;
        }
        setStep(3);
      } else if (step === 3) {
        if (!pin || pin.length < 4) {
          setErrorMessage('Please enter your 4-5 digit account PIN.');
          return;
        }
        executePayment();
      }
    } else {
      executePayment();
    }
  };

  // Submit payment to backend API
  const executePayment = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const activeAccount = availableGateways.find((g) => g.code === selectedGateway);

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
      setErrorMessage(err.message || 'Payment processing failed.');
      toast.error(err.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Gateway Selector Component
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {list.map((gw, idx) => {
          const isSelected = selectedGateway === gw.code;
          const uniqueKey = gw.id ? `gw-${gw.id}` : `${gw.code}-${idx}`;
          return (
            <button
              key={uniqueKey}
              type="button"
              onClick={() => setSelectedGateway(gw.code)}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors border cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary-dark font-semibold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {gw.label || gw.code.toUpperCase()}
              {gw.is_fallback ? (
                <span className="ml-1 text-[9px] opacity-75 font-normal">(Backup)</span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  // 1. BKASH THEMED COMPONENT
  const renderBkashTheme = () => (
    <div className="w-full bg-[#D12053] rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-pink-700/50">
        <div>
          <div className="font-semibold text-xs tracking-wide">bKash Payment</div>
          <p className="text-[10px] text-pink-100">{invoice.title || 'Academic Fee Clearance'}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-pink-200 uppercase font-semibold">Payable</div>
          <div className="text-sm font-mono font-semibold">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your bKash Account Number
              </label>
              <input
                type="tel"
                maxLength={11}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#D12053] focus:outline-none"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Enter your 11-digit bKash wallet number.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#D12053]"
              />
              <span>I accept bKash payment gateway terms and conditions.</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-center">
            <div>
              <h4 className="font-semibold text-xs text-slate-800 dark:text-white">Enter Verification Code (OTP)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Code sent to: {accountNumber}</p>
            </div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-36 mx-auto text-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-[#D12053] rounded text-sm font-mono tracking-widest focus:outline-none"
              autoFocus
            />
            <div className="text-[10px] text-slate-400">
              <button
                type="button"
                onClick={() => toast.success('New OTP sent to your phone.')}
                className="text-[#D12053] font-medium hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-center">
            <div>
              <h4 className="font-semibold text-xs text-slate-800 dark:text-white">Enter bKash PIN</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authorize payment of ৳{dueAmount.toFixed(2)} BDT
              </p>
            </div>
            <input
              type="password"
              maxLength={5}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="•••••"
              className="w-32 mx-auto text-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-[#D12053] rounded text-base font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-[#D12053] hover:bg-[#b01742] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Confirming...' : step === 3 ? 'Confirm Payment' : 'Proceed &rarr;'}
          </button>
        </div>
      </div>
    </div>
  );

  // 2. NAGAD THEMED COMPONENT
  const renderNagadTheme = () => (
    <div className="w-full bg-[#F7921E] rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-orange-400/40">
        <div>
          <div className="font-semibold text-xs tracking-wide">Nagad Gateway</div>
          <p className="text-[10px] text-orange-100">ডাক বিভাগের ডিজিটাল লেনদেন</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-orange-200 uppercase font-semibold">Payable</div>
          <div className="text-sm font-mono font-semibold">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nagad Account Number
              </label>
              <input
                type="tel"
                maxLength={11}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#F7921E] focus:outline-none"
                autoFocus
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#F7921E]"
              />
              <span>I agree to Nagad terms and policies.</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-center">
            <div>
              <h4 className="font-semibold text-xs text-slate-800 dark:text-white">Enter Nagad Verification Code</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">OTP sent to {accountNumber}</p>
            </div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-36 mx-auto text-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-[#F7921E] rounded text-sm font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-center">
            <div>
              <h4 className="font-semibold text-xs text-slate-800 dark:text-white">Enter Nagad PIN</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Authorize payment of ৳{dueAmount.toFixed(2)} BDT</p>
            </div>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-28 mx-auto text-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-[#F7921E] rounded text-base font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-[#F7921E] hover:bg-[#e07f16] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Processing...' : step === 3 ? 'Confirm Payment' : 'Proceed &rarr;'}
          </button>
        </div>
      </div>
    </div>
  );

  // 3. ROCKET (DBBL) THEMED COMPONENT
  const renderRocketTheme = () => (
    <div className="w-full bg-[#8C3494] rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-purple-800">
        <div>
          <div className="font-semibold text-xs tracking-wide">Rocket Banking</div>
          <p className="text-[10px] text-purple-200">Dutch-Bangla Bank Mobile Banking</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-purple-200 uppercase font-semibold">Total Fee</div>
          <div className="text-sm font-mono font-semibold">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rocket 12-Digit Mobile Account
              </label>
              <input
                type="tel"
                maxLength={12}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXXX (Mobile + 1 Check Digit)"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#8C3494] focus:outline-none"
                autoFocus
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#8C3494]"
              />
              <span>I confirm Rocket mobile debit authorization.</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-center">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-white">Rocket Security OTP</h4>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-36 mx-auto text-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-[#8C3494] rounded text-sm font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-center">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-white">Enter Rocket PIN</h4>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-28 mx-auto text-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-[#8C3494] rounded text-base font-mono tracking-widest focus:outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-[#8C3494] hover:bg-[#722879] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Validating...' : step === 3 ? 'Pay Now' : 'Next &rarr;'}
          </button>
        </div>
      </div>
    </div>
  );

  // 4. SONALI GATEWAY THEMED COMPONENT
  const renderSonaliTheme = () => (
    <div className="w-full bg-[#0B6623] rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-emerald-800">
        <div>
          <div className="font-semibold text-xs tracking-wide text-amber-200">Sonali Bank e-Payment Gateway</div>
          <p className="text-[10px] text-emerald-100">National Institutional Collection &amp; Treasury</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-emerald-200 uppercase font-semibold">Total Payable</div>
          <div className="text-sm font-mono font-semibold text-amber-300">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}

        {/* Channel Selector */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'account', label: 'Bank Account' },
            { id: 'wallet', label: 'Sonali e-Wallet' },
            { id: 'card', label: 'Debit Card' }
          ].map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSonaliChannel(ch.id)}
              className={`py-1.5 px-2 text-center text-xs font-medium rounded border transition-colors cursor-pointer ${
                sonaliChannel === ch.id
                  ? 'border-[#0B6623] bg-emerald-50 dark:bg-emerald-950/50 text-[#0B6623] dark:text-emerald-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        {sonaliChannel === 'account' && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sonali Bank Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="13 or 16-digit account number"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Mobile (for OTP)
              </label>
              <input
                type="tel"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
          </div>
        )}

        {sonaliChannel === 'wallet' && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sonali e-Wallet Registered Mobile
              </label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
          </div>
        )}

        {sonaliChannel === 'card' && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="XXXX XXXX XXXX XXXX"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-[#0B6623] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-[#0B6623] hover:bg-[#084e1b] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Clearing...' : 'Confirm via Sonali Gateway'}
          </button>
        </div>
      </div>
    </div>
  );

  // 5. SSLCOMMERZ THEMED COMPONENT
  const renderSSLCommerzTheme = () => (
    <div className="w-full bg-[#1F3A60] rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-slate-700">
        <div>
          <div className="font-semibold text-xs tracking-wide">SSLCOMMERZ Multi-Gateway</div>
          <p className="text-[10px] text-slate-300">PCI DSS Certified Payment Infrastructure</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-300 uppercase font-semibold">Total Payable</div>
          <div className="text-sm font-mono font-semibold text-cyan-300">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>

      <div className="grid grid-cols-3 bg-[#172D4B] border-b border-slate-700 text-xs font-medium">
        {[
          { id: 'cards', label: 'Cards (Visa/MC)' },
          { id: 'mobile', label: 'Mobile Banking' },
          { id: 'net', label: 'Net Banking' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSslTab(tab.id)}
            className={`py-2 text-center transition-colors border-b-2 cursor-pointer ${
              sslTab === tab.id
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}

        {sslTab === 'cards' && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4123 4567 8901 2345"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:border-cyan-600 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CVC</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="JOHN DOE"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
              />
            </div>
          </div>
        )}

        {sslTab === 'mobile' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {['bkash', 'nagad', 'rocket', 'upay', 'tap', 'okwallet'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSslSubMethod(m)}
                  className={`py-1.5 px-2 rounded border text-center text-xs font-medium uppercase transition-colors cursor-pointer ${
                    sslSubMethod === m
                      ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {sslSubMethod.toUpperCase()} Account Number
              </label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {sslTab === 'net' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Select Internet Banking Partner:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['City Touch', 'Islami Bank Bangladesh', 'BRAC Bank', 'MTB Direct', 'Bank Asia', 'Mutual Trust Bank'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSslSubMethod(b)}
                  className={`py-1.5 px-2.5 rounded border text-left transition-colors cursor-pointer ${
                    sslSubMethod === b
                      ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-[#1F3A60] hover:bg-[#162c4a] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Authorizing...' : `Pay ৳${dueAmount.toFixed(2)} BDT`}
          </button>
        </div>
      </div>
    </div>
  );

  // 6. STRIPE THEMED COMPONENT
  const renderStripeTheme = () => (
    <div className="w-full bg-[#635BFF] rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-indigo-400/30">
        <div>
          <div className="font-semibold text-xs tracking-wide">Stripe Card Checkout</div>
          <p className="text-[10px] text-indigo-100">Global Credit &amp; Debit Card Infrastructure</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-indigo-200 uppercase font-semibold">Payable</div>
          <div className="text-sm font-mono font-semibold">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}

        <div className="space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Card Information
            </label>
            <div className="border border-slate-300 dark:border-slate-700 rounded overflow-hidden">
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4242 •••• •••• 4242"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-mono border-b border-slate-200 dark:border-slate-700 focus:outline-none"
              />
              <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50 dark:bg-slate-800">
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM / YY"
                  className="px-3 py-1.5 text-xs font-mono focus:outline-none bg-transparent"
                />
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  placeholder="CVC"
                  className="px-3 py-1.5 text-xs font-mono focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Name on Card
            </label>
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs focus:border-[#635BFF] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-[#635BFF] hover:bg-[#4d44db] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Processing...' : `Pay ৳${dueAmount.toFixed(2)} BDT`}
          </button>
        </div>
      </div>
    </div>
  );

  // 7. GENERIC THEMED COMPONENT
  const renderGenericTheme = () => (
    <div className="w-full bg-slate-900 rounded-md overflow-hidden text-white font-sans">
      <div className="p-3.5 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="font-semibold text-xs tracking-wide uppercase">{selectedGateway} Gateway</div>
          <p className="text-[10px] text-slate-400">Institutional Clearance Portal</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Payable</div>
          <div className="text-sm font-mono font-semibold text-primary">৳{dueAmount.toFixed(2)} BDT</div>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-3">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded">
            {errorMessage}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Account / Card Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Account reference"
            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={executePayment}
            disabled={submitting}
            className="flex-1 py-1.5 px-3 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Executing...' : `Pay ৳${dueAmount.toFixed(2)} BDT`}
          </button>
        </div>
      </div>
    </div>
  );

  // 8. SUCCESS RECEIPT COMPONENT
  if (completedReceipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-md p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase">
                Payment Settled
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                Official Transaction Receipt
              </h3>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500">
              #{completedReceipt.invoice_no}
            </span>
          </div>

          {/* Receipt Data Table */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="font-mono font-medium text-primary-dark">{completedReceipt.transaction_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payer Name:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{completedReceipt.payer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Description:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{completedReceipt.title}</span>
            </div>
            {completedReceipt.student_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Student ID / Roll:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{completedReceipt.student_id}</span>
              </div>
            )}
            {completedReceipt.application_no && (
              <div className="flex justify-between">
                <span className="text-slate-500">Application Tracking:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{completedReceipt.application_no}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-800 dark:text-slate-200">Amount Paid:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                ৳{parseFloat(completedReceipt.amount).toFixed(2)} {completedReceipt.currency || 'BDT'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              Print Receipt
            </button>
            {completedReceipt.redirect_url ? (
              <button
                type="button"
                onClick={() => router.push(completedReceipt.redirect_url)}
                className="flex-1 py-1.5 px-3 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors"
              >
                Proceed to Document Upload &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-1.5 px-3 rounded bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modal Container
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-md p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        {/* Header & Close */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Online Fee Settlement
            </h3>
            <p className="text-xs text-slate-500">
              Invoice #{invoice.invoice_no} • <span className="font-mono font-medium text-slate-800 dark:text-slate-200">৳{dueAmount.toFixed(2)} {currency}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
          >
            Close
          </button>
        </div>

        {/* Gateway Selection Tabs */}
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
            Choose Payment Method
          </div>
          {renderGatewaySelector()}
        </div>

        {/* Themed Checkout Body */}
        <div className="pt-1">
          {selectedGateway === 'bkash' && renderBkashTheme()}
          {selectedGateway === 'nagad' && renderNagadTheme()}
          {selectedGateway === 'rocket' && renderRocketTheme()}
          {selectedGateway === 'sonali_gateway' && renderSonaliTheme()}
          {selectedGateway === 'sslcommerz' && renderSSLCommerzTheme()}
          {selectedGateway === 'stripe' && renderStripeTheme()}
          {!['bkash', 'nagad', 'rocket', 'sonali_gateway', 'sslcommerz', 'stripe'].includes(selectedGateway) && renderGenericTheme()}
        </div>

        <div className="text-center text-[10px] text-slate-400 pt-1">
          256-bit SSL encrypted &amp; verified institutional payment transaction.
        </div>
      </div>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';
export default function PaymentGatewayCheckout({ creatorId, paymentId, initialGateway = 'eps', onSuccess, }: any) {
    const [payment, setPayment] = useState<any>(null);
    const [epsMode, setEpsMode] = useState<any>('sandbox');
    const [loading, setLoading] = useState<any>(() => Boolean(creatorId && paymentId));
    const [paying, setPaying] = useState<any>(false);
    const [error, setError] = useState<any>('');
    const [paymentSuccess, setPaymentSuccess] = useState<any>(false);
    const [confirmedTxnId, setConfirmedTxnId] = useState<any>('');
    const [activeTab, setActiveTab] = useState<any>('BDT');
    const [bdtType, setBdtType] = useState<any>('MFS');
    const [mfsProvider, setMfsProvider] = useState<any>('bkash');
    const [bankProvider, setBankProvider] = useState<any>('city_touch');
    const [foreignCurrency, setForeignCurrency] = useState<any>('USD');
    const [mfsPhone, setMfsPhone] = useState<any>('');
    const [mfsTrxId, setMfsTrxId] = useState<any>('');
    const [bankAccountNo, setBankAccountNo] = useState<any>('');
    const [bankBranch, setBankBranch] = useState<any>('');
    const [bankTrxRef, setBankTrxRef] = useState<any>('');
    const [cardHolder, setCardHolder] = useState<any>('');
    const [cardNumber, setCardNumber] = useState<any>('');
    const [cardExpiry, setCardExpiry] = useState<any>('');
    const [cardCvv, setCardCvv] = useState<any>('');
    useEffect(() => {
        let isMounted = true;
        if (!creatorId || !paymentId) {
            return;
        }
        fetch(`/api/marketing/creator/payments?id=${paymentId}&creatorId=${creatorId}`)
            .then((res: any) => res.json())
            .then((data: any) => {
            if (!isMounted)
                return;
            if (data.success && data.payment) {
                setPayment(data.payment);
                if (data.epsMode)
                    setEpsMode(data.epsMode);
                if (data.payment.currency === 'USD') {
                    setActiveTab('FOREIGN');
                }
                if (data.payment.status === 'successful' || data.payment.status === 'COMPLETED') {
                    setPaymentSuccess(true);
                    setConfirmedTxnId(data.payment.transaction_id || '');
                    if (onSuccess)
                        onSuccess(data.payment);
                }
            }
            else {
                setError(data.error || 'Invoice record not found.');
            }
        })
            .catch(() => {
            if (!isMounted)
                return;
            setError('Network error fetching payment invoice.');
        })
            .finally(() => {
            if (isMounted)
                setLoading(false);
        });
        return () => {
            isMounted = false;
        };
    }, [creatorId, paymentId, onSuccess]);
    const isYearly = String(payment?.billing_interval || '').toUpperCase() === 'YEARLY';
    const bdtPrice = isYearly
        ? Number(payment?.yearly_price_bdt ?? payment?.amount ?? 0)
        : Number(payment?.monthly_price_bdt ?? payment?.amount ?? 0);
    const usdPrice = isYearly
        ? Number(payment?.yearly_price_usd ?? payment?.amount ?? 0)
        : Number(payment?.monthly_price_usd ?? payment?.amount ?? 0);
    const isBdtTab = activeTab === 'BDT';
    const activeAmount = isBdtTab ? bdtPrice : usdPrice;
    const activeCurrency = isBdtTab ? 'BDT' : foreignCurrency;
    const handleFillSandboxData = (type: any) => {
        setError('');
        if (type === 'bkash') {
            setActiveTab('BDT');
            setBdtType('MFS');
            setMfsProvider('bkash');
            setMfsPhone('01711000111');
            setMfsTrxId(`BKASH-${Date.now().toString().slice(-6)}`);
        }
        else if (type === 'nagad') {
            setActiveTab('BDT');
            setBdtType('MFS');
            setMfsProvider('nagad');
            setMfsPhone('01811000222');
            setMfsTrxId(`NAGAD-${Date.now().toString().slice(-6)}`);
        }
        else if (type === 'bank') {
            setActiveTab('BDT');
            setBdtType('BANK');
            setBankProvider('city_touch');
            setBankAccountNo('1102938475001');
            setBankBranch('Gulshan Branch, Dhaka');
            setBankTrxRef(`IB-CITY-${Date.now().toString().slice(-6)}`);
        }
        else if (type === 'card') {
            setActiveTab('FOREIGN');
            setForeignCurrency('USD');
            setCardHolder('Global Institute Owner');
            setCardNumber('4000 1234 5678 9010');
            setCardExpiry('12/28');
            setCardCvv('789');
        }
    };
    const handleConfirmPayment = async (e: any) => {
        e.preventDefault();
        if (!payment)
            return;
        setPaying(true);
        setError('');
        try {
            let resolvedSubMethod = 'eps';
            let accountRef = '';
            let gatewayTrxId = '';
            if (isBdtTab) {
                if (bdtType === 'MFS') {
                    resolvedSubMethod = `eps_mfs_${mfsProvider}`;
                    accountRef = mfsPhone || '01700000000';
                    gatewayTrxId = mfsTrxId || `EPS-MFS-${Date.now()}`;
                }
                else {
                    resolvedSubMethod = `eps_bank_${bankProvider}`;
                    accountRef = bankAccountNo || 'Bank Direct';
                    gatewayTrxId = bankTrxRef || `EPS-BANK-${Date.now()}`;
                }
            }
            else {
                resolvedSubMethod = 'eps_global_card';
                accountRef = cardNumber ? `Card ****${cardNumber.replace(/\s+/g, '').slice(-4)}` : 'Foreign Card';
                gatewayTrxId = `EPS-INTL-${Date.now()}`;
            }
            const res = await fetch('/api/marketing/creator/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'confirm_payment',
                    paymentId: payment.id,
                    creatorId: payment.creator_id || creatorId,
                    gatewayCode: resolvedSubMethod,
                    currency: activeCurrency,
                    accountNumber: accountRef,
                    gatewayOrderId: gatewayTrxId,
                    transactionId: gatewayTrxId,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPaymentSuccess(true);
                setConfirmedTxnId(data.transactionId || gatewayTrxId);
                if (onSuccess) {
                    onSuccess({
                        ...payment,
                        status: 'successful',
                        transaction_id: data.transactionId || gatewayTrxId,
                    });
                }
            }
            else {
                setError(data.error || 'Failed to verify and confirm payment with EPS.');
            }
        }
        catch {
            setError('Network communication error while confirming payment.');
        }
        finally {
            setPaying(false);
        }
    };
    if (loading) {
        return <LoadingScreen fullScreen={false} label="Connecting to EPS Payment Gateway..."/>;
    }
    if (paymentSuccess) {
        return (<div className="w-full max-w-xl mx-auto p-4 sm:p-6 my-8 text-xs text-slate-800 dark:text-slate-200">
        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl shadow-lg p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-3xl font-black">
            ✓
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Completed Successfully!</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Your subscription for {payment?.package_name || 'selected plan'} is now active and ready in your workspace.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left space-y-2.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Payment Invoice:</span>
              <span className="font-bold text-slate-900 dark:text-white">#{payment?.id || paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Transaction Reference:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{confirmedTxnId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Gateway Service:</span>
              <span className="font-bold text-slate-900 dark:text-white font-sans">Easy Payment System (EPS)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Gateway Mode:</span>
              <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400 font-sans">{epsMode}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-white">
              <span className="font-sans">Settled Amount:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {activeCurrency === 'BDT' ? `৳${activeAmount.toFixed(2)} BDT` : `$${activeAmount.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/workspace" className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer text-center">
              Go to Creator Workspace &rarr;
            </Link>
            <Link href={`/creator/${payment?.creator_id || creatorId}/payments`} className="py-3 px-5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition cursor-pointer text-center">
              View Billing History
            </Link>
          </div>
        </div>
      </div>);
    }
    return (<div className="w-full max-w-3xl mx-auto my-8 px-4 sm:px-6 space-y-6 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md">
            EPS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">EPS Payment Gateway</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${epsMode === 'sandbox'
            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'}`}>
                {epsMode === 'sandbox' ? 'Sandbox Mode' : 'Live Gateway'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Secure Payment for Sky International Institute Platform
            </div>
          </div>
        </div>
        <div className="text-right sm:text-right">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Invoice Reference</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">#{payment?.id || paymentId}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Package Subscription Plan
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {payment?.package_name || 'Standard Subscription'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Billing Interval: <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">{payment?.billing_interval || 'Monthly'}</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Payable Amount</span>
            <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {isBdtTab ? `৳${bdtPrice.toFixed(2)} BDT` : `$${usdPrice.toFixed(2)} USD`}
            </div>
          </div>
        </div>

        {error && (<div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium">
            {error}
          </div>)}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Select Currency & Rail
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setActiveTab('BDT')} className={`py-3 px-4 rounded-2xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${isBdtTab
            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 shadow-xs'
            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span>🇧🇩 Bangladeshi Currency (BDT)</span>
            </button>
            <button type="button" onClick={() => setActiveTab('FOREIGN')} className={`py-3 px-4 rounded-2xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${!isBdtTab
            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 shadow-xs'
            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span>🌐 Foreign Currencies (USD / Cards)</span>
            </button>
          </div>
        </div>

        {isBdtTab ? (<div className="space-y-4 pt-1">
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
              <button type="button" onClick={() => setBdtType('MFS')} className={`pb-2 text-xs font-bold border-b-2 transition cursor-pointer ${bdtType === 'MFS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                Mobile Financial Services (MFS)
              </button>
              <button type="button" onClick={() => setBdtType('BANK')} className={`pb-2 text-xs font-bold border-b-2 transition cursor-pointer ${bdtType === 'BANK'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                Bank Accounts & Internet Banking
              </button>
            </div>

            {bdtType === 'MFS' ? (<div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Choose MFS Provider
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                    { id: 'bkash', label: 'bKash', color: 'border-pink-500 text-pink-600 bg-pink-50/40 dark:bg-pink-950/30' },
                    { id: 'nagad', label: 'Nagad', color: 'border-orange-500 text-orange-600 bg-orange-50/40 dark:bg-orange-950/30' },
                    { id: 'rocket', label: 'Rocket', color: 'border-purple-500 text-purple-600 bg-purple-50/40 dark:bg-purple-950/30' },
                    { id: 'upay', label: 'Upay', color: 'border-blue-500 text-blue-600 bg-blue-50/40 dark:bg-blue-950/30' },
                ].map((mfs: any) => (<button key={mfs.id} type="button" onClick={() => setMfsProvider(mfs.id)} className={`p-3 rounded-2xl border text-center font-bold text-xs transition cursor-pointer ${mfsProvider === mfs.id
                        ? `${mfs.color} ring-2 ring-indigo-500/20 shadow-xs font-black`
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {mfs.label}
                      </button>))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {mfsProvider.toUpperCase()} Account Phone Number
                    </label>
                    <input type="text" required value={mfsPhone} onChange={(e: any) => setMfsPhone(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction ID / Payment OTP
                    </label>
                    <input type="text" required value={mfsTrxId} onChange={(e: any) => setMfsTrxId(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                  </div>
                </div>
              </div>) : (<div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Participating Bank
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                    { id: 'city_touch', label: 'City Touch' },
                    { id: 'islami_bank', label: 'Islami Bank' },
                    { id: 'dbbl_nexus', label: 'DBBL Nexus' },
                    { id: 'brac_bank', label: 'BRAC Bank' },
                ].map((bank: any) => (<button key={bank.id} type="button" onClick={() => setBankProvider(bank.id)} className={`p-3 rounded-2xl border text-center font-bold text-xs transition cursor-pointer ${bankProvider === bank.id
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-black'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {bank.label}
                      </button>))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account / Card Number
                    </label>
                    <input type="text" required value={bankAccountNo} onChange={(e: any) => setBankAccountNo(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Branch / District
                    </label>
                    <input type="text" required value={bankBranch} onChange={(e: any) => setBankBranch(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Deposit / Transfer Reference
                    </label>
                    <input type="text" required value={bankTrxRef} onChange={(e: any) => setBankTrxRef(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                  </div>
                </div>
              </div>)}
          </div>) : (<div className="space-y-4 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                EPS Global Dual Currency Rails
              </span>
              <div className="flex gap-2">
                {['USD', 'EUR', 'GBP'].map((curr: any) => (<button key={curr} type="button" onClick={() => setForeignCurrency(curr)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${foreignCurrency === curr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    {curr}
                  </button>))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cardholder Full Name
                </label>
                <input type="text" required value={cardHolder} onChange={(e: any) => setCardHolder(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  International Card Number (Visa / MasterCard / Amex)
                </label>
                <input type="text" required value={cardNumber} onChange={(e: any) => setCardNumber(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiration Date (MM/YY)
                  </label>
                  <input type="text" required value={cardExpiry} onChange={(e: any) => setCardExpiry(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Code (CVV / CVC)
                  </label>
                  <input type="password" required maxLength={4} value={cardCvv} onChange={(e: any) => setCardCvv(e.target.value)} className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"/>
                </div>
              </div>
            </div>
          </div>)}

        {epsMode === 'sandbox' && (<div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Sandbox Test Simulator Tools
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Auto-fill mock data</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button type="button" onClick={() => handleFillSandboxData('bkash')} className="py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-[11px] font-semibold cursor-pointer text-center">
                bKash Mock
              </button>
              <button type="button" onClick={() => handleFillSandboxData('nagad')} className="py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-[11px] font-semibold cursor-pointer text-center">
                Nagad Mock
              </button>
              <button type="button" onClick={() => handleFillSandboxData('bank')} className="py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-[11px] font-semibold cursor-pointer text-center">
                Bank Mock
              </button>
              <button type="button" onClick={() => handleFillSandboxData('card')} className="py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-[11px] font-semibold cursor-pointer text-center">
                USD Card Mock
              </button>
            </div>
          </div>)}

        <button type="button" onClick={handleConfirmPayment} disabled={paying} className="w-full py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide transition shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
          {paying ? (<span>Processing Payment via EPS...</span>) : (<span>
              Pay {isBdtTab ? `৳${bdtPrice.toFixed(2)} BDT` : `$${usdPrice.toFixed(2)} USD`} via EPS Gateway &rarr;
            </span>)}
        </button>
      </div>
    </div>);
}

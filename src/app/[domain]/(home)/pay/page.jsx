'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiCreditCard,
  FiSearch,
  FiBookOpen,
  FiFileText,
  FiHome,
  FiUserCheck,
  FiShield,
  FiCheckCircle,
  FiArrowRight,
  FiAlertCircle,
  FiClock,
  FiDollarSign,
  FiLock,
  FiHelpCircle
} from 'react-icons/fi';
import UniversalGatewayCheckout from '@/component/payment/UniversalGatewayCheckout';

export default function PayHomePage() {
  const params = useParams();
  const domain = params?.domain || '';

  // Search State
  const [identifier, setIdentifier] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Active Payment Modal State
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Available Gateways from API
  const [availableGateways, setAvailableGateways] = useState([]);

  // Category Cards Data
  const categories = [
    {
      title: 'Education & Tuition Fees',
      path: '/pay/education-fees',
      icon: <FiBookOpen className="w-6 h-6 text-indigo-500" />,
      color: 'from-indigo-500/10 to-indigo-600/5',
      borderColor: 'hover:border-indigo-500/50',
      badge: 'Tuition & Semester',
      description: 'Clear monthly tuition, session charges, laboratory dues, and semester enrollment fees.'
    },
    {
      title: 'Examination Fees',
      path: '/pay/exam-fees',
      icon: <FiFileText className="w-6 h-6 text-purple-500" />,
      color: 'from-purple-500/10 to-purple-600/5',
      borderColor: 'hover:border-purple-500/50',
      badge: 'Admit Card Clearance',
      description: 'Pay midterm, final, and backlog exam fees. Unlocks your exam admit card immediately.'
    },
    {
      title: 'Admission Application Fees',
      path: '/pay/admission-fees',
      icon: <FiUserCheck className="w-6 h-6 text-blue-500" />,
      color: 'from-blue-500/10 to-blue-600/5',
      borderColor: 'hover:border-blue-500/50',
      badge: 'New Applicants',
      description: 'Search by application tracking number. Settling fee unlocks candidate photo upload.'
    },
    {
      title: 'Hall & Residential Fees',
      path: '/pay/residential-fees',
      icon: <FiHome className="w-6 h-6 text-rose-500" />,
      color: 'from-rose-500/10 to-rose-600/5',
      borderColor: 'hover:border-rose-500/50',
      badge: 'Hostel & Dormitory',
      description: 'Pay monthly hall seat rent, utility dues, dining tokens, and dormitory maintenance.'
    }
  ];

  // Perform Lookup
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your Student ID, Roll, Reg, or Application Number.');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setLookupResult(null);

    try {
      const endpoint = domain
        ? `/api/${domain}/pay?identifier=${encodeURIComponent(identifier.trim())}&type=${selectedCategory}`
        : `/api/pay?identifier=${encodeURIComponent(identifier.trim())}&type=${selectedCategory}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No matching student or applicant record found.');
      }

      setLookupResult(data);
      if (data.available_gateways) {
        setAvailableGateways(data.available_gateways);
      }
    } catch (err) {
      toast.error(err.message || 'Lookup failed.');
      setLookupResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Open Checkout for a specific due item
  const openPaymentModal = (item) => {
    setActiveInvoice(item);
    setCheckoutOpen(true);
  };

  // After payment completes, refresh dues
  const handlePaymentSuccess = () => {
    handleSearch();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-white via-indigo-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-sm">
            <FiShield className="w-3.5 h-3.5" />
            <span>Official Institutional Online Payment Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Pay Student & Admission Fees <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 bg-clip-text text-transparent">
              Fast, Verified & 100% Secure
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Check your pending tuition, semester charges, examination fees, admission application tracking dues, or residential hall rent. Pay instantly through bKash, Nagad, Rocket, Sonali Bank, Stripe & cards.
          </p>

          {/* CENTRAL UNIFIED SEARCH ENGINE */}
          <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Student ID, Roll No, Reg No, or Application Tracking No..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-0 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Fee Types</option>
                <option value="education">Education & Tuition</option>
                <option value="exam">Examination Fees</option>
                <option value="admission">Admission Application</option>
                <option value="residential">Hall & Residential</option>
              </select>

              <button
                type="submit"
                disabled={searching}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {searching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <span>Look Up Dues</span>
                    <FiArrowRight />
                  </>
                )}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">Supported Identifiers:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Student Roll/Reg</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Unique Student ID</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Application Tracking #</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Registered Phone</span>
            </div>
          </div>
        </div>
      </section>

      {/* DUES SEARCH RESULT SECTION (IF SEARCHED) */}
      {hasSearched && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
          {lookupResult ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold">
                    {(lookupResult.student?.name || lookupResult.applicant?.applicant_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {lookupResult.student?.name || lookupResult.applicant?.applicant_name}
                      </h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        Verified Record
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      {lookupResult.student && (
                        <>
                          <span>ID: <strong>{lookupResult.student.student_unique_id}</strong></span>
                          <span>•</span>
                          <span>Class/Dept: <strong>{lookupResult.student.class_name}</strong></span>
                          <span>•</span>
                          <span>Roll: <strong>{lookupResult.student.roll_no}</strong></span>
                        </>
                      )}
                      {lookupResult.applicant && (
                        <>
                          <span>App Tracking: <strong className="font-mono text-indigo-600">{lookupResult.applicant.application_no}</strong></span>
                          <span>•</span>
                          <span>Circular: <strong>{lookupResult.applicant.circular_title}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-400">Total Outstanding</div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ৳{lookupResult.summary?.total_due_amount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-400">Pending Invoices</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {lookupResult.summary?.total_unpaid_items || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Unpaid Invoices & Charges
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {lookupResult.summary?.total_unpaid_items || 0} items found
                  </span>
                </div>

                {lookupResult.summary?.total_unpaid_items === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <FiCheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h4 className="font-bold text-slate-900 dark:text-white">No Outstanding Dues Found!</h4>
                    <p className="text-xs text-slate-500">
                      All tuition, examination, and residential invoices are fully cleared and in good standing.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      ...(lookupResult.dues?.education || []),
                      ...(lookupResult.dues?.exam || []),
                      ...(lookupResult.dues?.admission || []),
                      ...(lookupResult.dues?.residential || [])
                    ].map((inv) => (
                      <div
                        key={inv.invoice_no || inv.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {inv.category_label || inv.category}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              #{inv.invoice_no}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {inv.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {inv.month_name && <span>Billing Month: {inv.month_name}</span>}
                            {inv.due_date && <span>Due Date: {new Date(inv.due_date).toLocaleDateString()}</span>}
                            {inv.fine_amount > 0 && <span className="text-rose-500">+ Fine: ৳{inv.fine_amount}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Net Payable</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white">
                              ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openPaymentModal(inv)}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                          >
                            <FiCreditCard />
                            <span>Pay Now</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !searching ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <FiAlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                No Record Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We could not find any active student or admission applicant with the identifier <strong>{identifier}</strong>. Please check your Roll, Registration, or Application number and try again.
              </p>
            </div>
          ) : null}
        </section>
      )}

      {/* DEDICATED CATEGORY HUBS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Browse by Fee Category
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Dedicated portals for specific institutional billing and fee collections
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.path}
              href={cat.path}
              className={`group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${cat.borderColor} hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700/50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {cat.badge}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1 group-hover:text-indigo-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Access Portal</span>
                <FiArrowRight />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SUPPORTED GATEWAYS BADGES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center space-y-2 mb-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Integrated Payment Infrastructure
          </span>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Supported Bangladesh & International Payment Gateways
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2">
          {[
            { name: 'bKash', color: '#D12053' },
            { name: 'Nagad', color: '#F7921E' },
            { name: 'Rocket (DBBL)', color: '#8C3494' },
            { name: 'Sonali Gateway', color: '#0B6623' },
            { name: 'SSLCommerz', color: '#1F3A60' },
            { name: 'Stripe (Visa/Mastercard)', color: '#635BFF' },
            { name: 'SurjoPay', color: '#E31B23' },
            { name: 'EPS (Easy Payment)', color: '#00A896' }
          ].map((gw) => (
            <div
              key={gw.name}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gw.color }} />
              <span>{gw.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* UNIVERSAL PAYMENT CHECKOUT MODAL */}
      <UniversalGatewayCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        invoice={activeInvoice}
        availableGateways={availableGateways}
        domain={domain}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

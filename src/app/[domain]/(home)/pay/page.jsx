'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import UniversalGatewayCheckout from 'src/component/payment/UniversalGatewayCheckout';

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

  // Category Hubs Data
  const categories = [
    {
      title: 'Education & Tuition Fees',
      path: '/pay/education-fees',
      badge: 'Tuition & Semester',
      description: 'Monthly tuition, semester session charges, laboratory dues, and course enrollment fees.'
    },
    {
      title: 'Examination Fees',
      path: '/pay/exam-fees',
      badge: 'Admit Card Clearance',
      description: 'Midterm, semester final, and backlog exam fees. Unlocks printable examination admit cards.'
    },
    {
      title: 'Admission Application Fees',
      path: '/pay/admission-fees',
      badge: 'Applicant Clearance',
      description: 'Lookup application tracking number and settle intake circular fees to proceed to media upload.'
    },
    {
      title: 'Hall & Residential Fees',
      path: '/pay/residential-fees',
      badge: 'Hostel & Dormitory',
      description: 'Monthly seat rent, dormitory utilities, dining charges, and hall development dues.'
    }
  ];

  // Perform Lookup
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter a Student ID, Roll No, Reg No, or Application Tracking Number.');
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

  const openPaymentModal = (item) => {
    setActiveInvoice(item);
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    handleSearch();
  };

  const allDues = lookupResult
    ? [
        ...(lookupResult.dues?.education || []),
        ...(lookupResult.dues?.exam || []),
        ...(lookupResult.dues?.admission || []),
        ...(lookupResult.dues?.residential || [])
      ]
    : [];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        
        {/* 1. Header & Unified Lookup Workstation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-start gap-2 border-b border-slate-200 dark:border-slate-800 pb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
            Institutional Portal &bull; Fee Clearance
          </div>
          <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
            Student &amp; Applicant Online Payment Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light">
            Check outstanding dues, verify invoices, and clear payments through integrated digital gateways.
          </p>
        </motion.div>

        {/* Search Engine Workstation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block mb-1">
                Direct Inquiries
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
                Account &amp; Invoice Lookup
              </h2>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Supported Currencies</div>
              <div className="font-mono text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                ৳ BDT / $ USD (Isolated)
              </div>
            </div>
          </div>

          {/* Search Engine Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter Student ID, Roll No, Reg No, or Application Tracking No..."
              className="input-style w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-style w-full sm:w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0"
            >
              <option value="all">All Fee Categories</option>
              <option value="education">Education &amp; Tuition</option>
              <option value="exam">Examination Fees</option>
              <option value="admission">Admission Application</option>
              <option value="residential">Hall &amp; Residential</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={searching}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 shrink-0"
            >
              {searching ? 'Searching...' : 'Lookup Dues'}
            </motion.button>
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400 dark:text-slate-500 font-light">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Supported Identifiers:</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">Student Roll / Reg</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">Student ID</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">Application Tracking #</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">Registered Phone</span>
          </div>
        </motion.div>

        {/* 2. Dues Search Results (When Looked Up) */}
        {hasSearched && (
          <div className="w-full space-y-6">
            {lookupResult ? (
              <>
                {/* Record Summary KPI */}
                <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-primary block mb-1">Verified Profile</div>
                      <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                        {lookupResult.student?.name || lookupResult.applicant?.applicant_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-light">
                        {lookupResult.student && (
                          <>
                            <span>ID: <strong className="font-mono font-medium text-slate-900 dark:text-white">{lookupResult.student.student_unique_id}</strong></span>
                            <span>&bull;</span>
                            <span>Class/Dept: {lookupResult.student.class_name}</span>
                            <span>&bull;</span>
                            <span>Roll: {lookupResult.student.roll_no}</span>
                          </>
                        )}
                        {lookupResult.applicant && (
                          <>
                            <span>App Tracking: <strong className="font-mono font-medium text-primary">{lookupResult.applicant.application_no}</strong></span>
                            <span>&bull;</span>
                            <span>Circular: {lookupResult.applicant.circular_title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-right">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Pending Invoices</div>
                        <div className="font-mono text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {lookupResult.summary?.total_unpaid_items || 0} items
                        </div>
                      </div>
                      <div className="border-l border-slate-200 dark:border-slate-700 pl-5">
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Outstanding</div>
                        <div className="font-mono text-base sm:text-lg font-semibold text-secondary mt-0.5">
                          ৳{parseFloat(lookupResult.summary?.total_due_amount || 0).toFixed(2)} BDT
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Invoices Table */}
                  {allDues.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400 space-y-1 font-light">
                      <div className="font-serif text-lg text-slate-900 dark:text-white font-normal">All Dues Cleared</div>
                      <p>No unpaid invoices found for this record. Your account is in good standing.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold tracking-wider">
                            <th className="pb-3 px-2">Invoice No</th>
                            <th className="pb-3 px-2">Category</th>
                            <th className="pb-3 px-2">Title / Description</th>
                            <th className="pb-3 px-2">Period / Due Date</th>
                            <th className="pb-3 px-2">Payable Amount</th>
                            <th className="pb-3 px-2">Status</th>
                            <th className="pb-3 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                          {allDues.map((inv) => (
                            <tr key={inv.invoice_no || inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-2 font-mono text-slate-900 dark:text-white font-medium">
                                #{inv.invoice_no}
                              </td>
                              <td className="py-3.5 px-2">
                                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                                  {inv.category_label || inv.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                {inv.title}
                              </td>
                              <td className="py-3.5 px-2 text-slate-500 dark:text-slate-400 text-xs">
                                {inv.month_name || (inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate')}
                                {inv.fine_amount > 0 && <span className="text-secondary ml-1 font-medium">(+৳{inv.fine_amount} fine)</span>}
                              </td>
                              <td className="py-3.5 px-2 font-mono font-medium text-slate-900 dark:text-white">
                                ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)} {inv.currency || 'BDT'}
                              </td>
                              <td className="py-3.5 px-2">
                                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-secondary/10 text-secondary border-secondary/20">
                                  Pending
                                </span>
                              </td>
                              <td className="py-3.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(inv)}
                                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-all shadow-xs hover:shadow-md cursor-pointer"
                                >
                                  Pay Now
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : !searching ? (
              <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-10 text-center space-y-2 shadow-xs">
                <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border bg-secondary/10 text-secondary border-secondary/20 uppercase tracking-wider">
                  Not Found
                </span>
                <h3 className="font-serif text-lg text-slate-900 dark:text-white mt-2">
                  No Record Matching &quot;{identifier}&quot;
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-light">
                  Please verify your Student ID, Roll Number, or Application Tracking Number and ensure the correct fee category is selected.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* 3. Category Hubs Grid */}
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
                Fee Categories &amp; Direct Portals
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">
                Access dedicated fee payment portals directly by category.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.path}
                href={cat.path}
                className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-primary/40 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between space-y-4 shadow-xs group"
              >
                <div className="space-y-2">
                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                    {cat.badge}
                  </span>
                  <h3 className="font-serif text-base sm:text-lg font-normal text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="text-xs sm:text-sm font-medium text-primary flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Access Portal</span>
                  <span className="font-mono transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 4. Supported Gateways Infrastructure */}
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
                Supported Payment Gateways
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">
                Integrated national mobile financial services, banking portals, and international card networks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {[
              'bKash Tokenized Checkout',
              'Nagad Direct Gateway',
              'Rocket (DBBL)',
              'Sonali Bank e-Payment Gateway',
              'SSLCommerz Multi-Gateway',
              'Stripe Card Payments',
              'SurjoPay Gateway',
              'EPS (Easy Payment System)'
            ].map((gw) => (
              <span
                key={gw}
                className="text-xs font-medium text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/60 shadow-xs"
              >
                {gw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Checkout Modal */}
      <UniversalGatewayCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        invoice={activeInvoice}
        availableGateways={activeInvoice?.assigned_gateways || lookupResult?.gateways_by_purpose?.[activeInvoice?.category] || availableGateways}
        domain={domain}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

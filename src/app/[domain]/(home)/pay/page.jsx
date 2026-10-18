'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
      {/* 1. Header & Unified Lookup Workstation */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary-dark border-primary/20 uppercase tracking-wider">
                Institutional Portal
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                Fee Clearance
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
              Student & Applicant Online Payment Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Check outstanding dues, verify invoices, and clear payments through integrated digital gateways.
            </p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Supported Currencies</div>
              <div className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                ৳ BDT / $ USD (Isolated)
              </div>
            </div>
          </div>
        </div>

        {/* Search Engine Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter Student ID, Roll No, Reg No, or Application Tracking No..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Fee Categories</option>
            <option value="education">Education & Tuition</option>
            <option value="exam">Examination Fees</option>
            <option value="admission">Admission Application</option>
            <option value="residential">Hall & Residential</option>
          </select>

          <button
            type="submit"
            disabled={searching}
            className="w-full sm:w-auto px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {searching ? 'Searching...' : 'Lookup Dues'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400">
          <span className="font-semibold uppercase">Supported Identifiers:</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">Student Roll / Reg</span>
          <span>•</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">Student ID</span>
          <span>•</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">Application Tracking #</span>
          <span>•</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">Registered Phone</span>
        </div>
      </div>

      {/* 2. Dues Search Results (When Looked Up) */}
      {hasSearched && (
        <div className="w-full space-y-4">
          {lookupResult ? (
            <>
              {/* Record Summary KPI */}
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Verified Profile</div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {lookupResult.student?.name || lookupResult.applicant?.applicant_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {lookupResult.student && (
                        <>
                          <span>ID: <strong className="font-mono font-medium text-slate-800 dark:text-slate-200">{lookupResult.student.student_unique_id}</strong></span>
                          <span>•</span>
                          <span>Class/Dept: {lookupResult.student.class_name}</span>
                          <span>•</span>
                          <span>Roll: {lookupResult.student.roll_no}</span>
                        </>
                      )}
                      {lookupResult.applicant && (
                        <>
                          <span>App Tracking: <strong className="font-mono font-medium text-primary-dark">{lookupResult.applicant.application_no}</strong></span>
                          <span>•</span>
                          <span>Circular: {lookupResult.applicant.circular_title}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Pending Invoices</div>
                      <div className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                        {lookupResult.summary?.total_unpaid_items || 0} items
                      </div>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Total Outstanding</div>
                      <div className="font-mono text-sm font-semibold text-secondary-dark">
                        ৳{parseFloat(lookupResult.summary?.total_due_amount || 0).toFixed(2)} BDT
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoices Table */}
                {allDues.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                    <div className="font-medium text-slate-900 dark:text-white">All Dues Cleared</div>
                    <p className="text-slate-400">No unpaid invoices found for this record. Your account is in good standing.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                          <th className="pb-2">Invoice No</th>
                          <th className="pb-2">Category</th>
                          <th className="pb-2">Title / Description</th>
                          <th className="pb-2">Period / Due Date</th>
                          <th className="pb-2">Payable Amount</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                        {allDues.map((inv) => (
                          <tr key={inv.invoice_no || inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 font-mono text-slate-900 dark:text-white font-medium">
                              #{inv.invoice_no}
                            </td>
                            <td className="py-2.5">
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                                {inv.category_label || inv.category}
                              </span>
                            </td>
                            <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                              {inv.title}
                            </td>
                            <td className="py-2.5 text-slate-500">
                              {inv.month_name || (inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate')}
                              {inv.fine_amount > 0 && <span className="text-rose-600 ml-1">(+৳{inv.fine_amount} fine)</span>}
                            </td>
                            <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                              ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)} {inv.currency || 'BDT'}
                            </td>
                            <td className="py-2.5">
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                                Pending
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => openPaymentModal(inv)}
                                className="px-3 py-1 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors cursor-pointer"
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
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-1">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 uppercase">
                Not Found
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
                No Record Matching &quot;{identifier}&quot;
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Please verify your Student ID, Roll Number, or Application Tracking Number and ensure the correct fee category is selected.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 3. Category Hubs Grid */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Fee Categories & Direct Portals
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Access dedicated fee payment portals directly by category.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.path}
              href={cat.path}
              className="p-3.5 rounded border border-slate-200 dark:border-slate-800 hover:border-primary/60 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary-dark border-primary/20">
                  {cat.badge}
                </span>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="text-xs font-medium text-primary hover:underline flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Access Portal</span>
                <span className="font-mono">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 4. Supported Gateways Infrastructure */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Supported Payment Gateways
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Integrated national mobile financial services, banking portals, and international card networks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
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
              className="text-xs font-normal text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60"
            >
              {gw}
            </span>
          ))}
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

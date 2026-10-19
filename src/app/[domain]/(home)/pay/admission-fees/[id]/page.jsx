'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import UniversalGatewayCheckout from 'src/component/payment/UniversalGatewayCheckout';

export default function CandidateAdmissionPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const domain = params?.domain || '';

  const [loading, setLoading] = useState(true);
  const [applicant, setApplicant] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [availableGateways, setAvailableGateways] = useState([]);
  const [isPaid, setIsPaid] = useState(false);

  // Gateway Modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const fetchCandidateInvoice = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const endpoint = domain
        ? `/api/${domain}/pay/admission-fees/${encodeURIComponent(id)}`
        : `/api/pay/admission-fees/${encodeURIComponent(id)}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success || !data.applicant) {
        throw new Error(data.error || 'Applicant record not found for this identifier.');
      }

      setApplicant(data.applicant);
      setAvailableGateways(data.available_gateways || []);

      const admInvoices = data.dues?.admission || [];
      if (admInvoices.length > 0) {
        setInvoice(admInvoices[0]);
        if (admInvoices[0].payment_status === 'paid') {
          setIsPaid(true);
        }
      } else {
        if (data.applicant.status === 'fee_paid' || data.applicant.status === 'approved') {
          setIsPaid(true);
        } else {
          setInvoice({
            id: data.applicant.id,
            category: 'admission_fees',
            category_label: 'Admission Application Fee',
            invoice_no: `INV-ADM-${data.applicant.application_no}`,
            title: `Admission Fee — ${data.applicant.circular_title}`,
            amount: parseFloat(data.applicant.fee_amount || 500),
            net_due: parseFloat(data.applicant.fee_amount || 500),
            currency: data.applicant.fee_currency || 'BDT',
            payment_status: 'pending'
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error loading admission invoice.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidateInvoice();
  }, [id, domain]);

  const handlePaymentSuccess = () => {
    setIsPaid(true);
    toast.success('Application fee confirmed! Advancing to photo upload...');
    setTimeout(() => {
      router.push(`/admission/upload/${id}`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3 text-slate-500">
        <div className="loader loader-sm" />
        <div className="text-xs font-mono text-slate-400">Loading admission invoice...</div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border bg-secondary/10 text-secondary border-secondary/20 uppercase tracking-wider">
            Not Found
          </span>
          <h3 className="font-serif text-2xl font-normal text-slate-900 dark:text-white">
            Application Record Not Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-light max-w-md mx-auto">
            The requested application identifier could not be verified in this institution&apos;s records.
          </p>
          <div className="pt-2">
            <Link
              href="/pay/admission-fees"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary/40 font-medium text-xs sm:text-sm transition-all shadow-xs inline-block"
            >
              &larr; Return to Admission Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ALREADY PAID VIEW
  if (isPaid) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-3xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-primary/20 rounded-3xl p-8 sm:p-12 space-y-6 text-center shadow-xs">
          <div>
            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
              Settled &amp; Verified
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white mt-3">
              Application Fee Cleared Successfully
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto font-light">
              Your application fee has been confirmed. You can now upload your candidate photograph and signature.
            </p>
          </div>

          {/* Candidate Summary Table */}
          <div className="max-w-xl mx-auto bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 text-xs sm:text-sm text-left space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Applicant:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{applicant.applicant_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Application Tracking:</span>
              <span className="font-mono font-medium text-primary">{applicant.application_no}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Circular:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{applicant.circular_title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Payment Status:</span>
              <span className="font-mono font-semibold text-primary uppercase text-xs">PAID &amp; VERIFIED</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/admission/upload/${applicant.id}`}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-all shadow-xs hover:shadow-md inline-block cursor-pointer"
            >
              Proceed to Upload Candidate Media &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // UNPAID CHECKOUT VIEW
  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        
        {/* 1. Header & Navigation */}
        <div className="flex flex-col items-start gap-2 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link
              href="/pay/admission-fees"
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              &larr; Back to Admission Search
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
              Step 2 of 3: Fee Clearance
            </span>
          </div>
          <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
                Complete Admission Application Fee Payment
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light mt-1">
                Select your preferred digital payment gateway to settle the application fee and advance to document upload.
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Total Payable</span>
              <div className="font-serif text-2xl sm:text-3xl font-normal text-secondary">
                ৳{invoice ? parseFloat(invoice.net_due || invoice.amount).toFixed(2) : '500.00'} BDT
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Detail Card */}
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block mb-1">
              Candidate Dossier
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
              Fee Assessment Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
            <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Candidate Name</span>
              <div className="font-serif text-base sm:text-lg font-normal text-slate-900 dark:text-white mt-1">{applicant.applicant_name}</div>
            </div>
            <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Application Tracking</span>
              <div className="font-mono font-medium text-primary mt-1 text-sm sm:text-base">{applicant.application_no}</div>
            </div>
            <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Admission Circular</span>
              <div className="font-medium text-slate-900 dark:text-white mt-1">{applicant.circular_title}</div>
            </div>
            <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Contact Phone</span>
              <div className="font-mono text-slate-700 dark:text-slate-300 mt-1">{applicant.masked_phone || applicant.phone}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-light">
              Invoice Ref: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">#{invoice?.invoice_no || `INV-ADM-${applicant.application_no}`}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-xs sm:text-sm transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              Choose Gateway &amp; Pay ৳{invoice ? parseFloat(invoice.net_due || invoice.amount).toFixed(2) : '500.00'} BDT
            </button>
          </div>
        </div>

        {/* 2. Workflow Progression Indicator */}
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
            Admission Workflow Steps
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div className="p-5 rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <div className="font-serif text-base font-normal">1. Application Submitted</div>
              <p className="text-xs opacity-85 mt-1 font-light">Academic records and profile details registered.</p>
            </div>
            <div className="p-5 rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary shadow-xs">
              <div className="font-serif text-base font-normal">2. Fee Clearance (Active)</div>
              <p className="text-xs opacity-85 mt-1 font-light">Settle application fee via bKash, Nagad, or cards.</p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 shadow-xs">
              <div className="font-serif text-base font-normal text-slate-900 dark:text-white">3. Media Upload</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">Unlocks immediately upon payment confirmation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Checkout Modal */}
      <UniversalGatewayCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        invoice={invoice}
        availableGateways={availableGateways}
        domain={domain}
        apiEndpoint={domain ? `/api/${domain}/pay/admission-fees/${id}` : `/api/pay/admission-fees/${id}`}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

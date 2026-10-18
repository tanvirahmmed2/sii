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
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-2 text-slate-500">
        <div className="text-xs font-mono">Loading admission invoice...</div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5">
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-2">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 uppercase">
            Not Found
          </span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            Application Record Not Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The requested application identifier could not be verified in this institution&apos;s records.
          </p>
          <div className="pt-2">
            <Link
              href="/pay/admission-fees"
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors inline-block"
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
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
        <div className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded p-6 space-y-4 text-center">
          <div>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase">
              Settled &amp; Verified
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-2">
              Application Fee Cleared Successfully
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your application fee has been confirmed. You can now upload your candidate photograph and signature.
            </p>
          </div>

          {/* Candidate Summary Table */}
          <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 p-3.5 text-xs text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Applicant:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{applicant.applicant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Application Tracking:</span>
              <span className="font-mono font-medium text-primary-dark">{applicant.application_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Circular:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{applicant.circular_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Status:</span>
              <span className="font-mono font-medium text-emerald-600 uppercase">PAID &amp; VERIFIED</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/admission/upload/${applicant.id}`}
              className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors inline-block"
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
      {/* 1. Header & Navigation */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/pay/admission-fees"
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                &larr; Back to Admission Search
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary-dark border-primary/20 uppercase tracking-wider">
                Step 2 of 3: Fee Clearance
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Complete Admission Application Fee Payment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your preferred digital payment gateway to settle the application fee and advance to document upload.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Total Payable</span>
            <div className="font-mono text-sm font-semibold text-secondary-dark">
              ৳{invoice ? parseFloat(invoice.net_due || invoice.amount).toFixed(2) : '500.00'} BDT
            </div>
          </div>
        </div>

        {/* Candidate Detail Card */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Candidate Name</span>
              <div className="font-medium text-slate-900 dark:text-white mt-0.5">{applicant.applicant_name}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Application Tracking</span>
              <div className="font-mono font-medium text-primary-dark mt-0.5">{applicant.application_no}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Admission Circular</span>
              <div className="font-medium text-slate-900 dark:text-white mt-0.5">{applicant.circular_title}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Contact Phone</span>
              <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{applicant.masked_phone || applicant.phone}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Invoice Ref: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">#{invoice?.invoice_no || `INV-ADM-${applicant.application_no}`}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Choose Gateway &amp; Pay ৳{invoice ? parseFloat(invoice.net_due || invoice.amount).toFixed(2) : '500.00'} BDT
            </button>
          </div>
        </div>
      </div>

      {/* 2. Workflow Progression Indicator */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2">
        <div className="text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          Admission Workflow Steps
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
            <div className="font-semibold text-emerald-900">1. Application Submitted</div>
            <p className="text-[11px] text-emerald-700 mt-0.5">Academic records and profile details registered.</p>
          </div>
          <div className="p-3 rounded border border-amber-200 bg-amber-50 text-amber-800">
            <div className="font-semibold text-amber-900">2. Fee Clearance (Active)</div>
            <p className="text-[11px] text-amber-700 mt-0.5">Settle application fee via bKash, Nagad, or cards.</p>
          </div>
          <div className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-700 dark:text-slate-300">3. Media Upload</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Unlocks immediately upon payment confirmation.</p>
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

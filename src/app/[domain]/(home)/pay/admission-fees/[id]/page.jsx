'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiUserCheck,
  FiCreditCard,
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiFileText,
  FiLock,
  FiCalendar,
  FiClock
} from 'react-icons/fi';
import UniversalGatewayCheckout from '@/component/payment/UniversalGatewayCheckout';

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
        // If no unpaid admission invoice found, check if already fee_paid
        if (data.applicant.status === 'fee_paid' || data.applicant.status === 'approved') {
          setIsPaid(true);
        } else {
          // Construct default invoice from applicant info
          setInvoice({
            id: data.applicant.id,
            category: 'admission',
            category_label: 'Admission Application Fee',
            invoice_no: `INV-ADM-${data.applicant.application_no}`,
            title: `Admission Fee — ${data.applicant.circular_title}`,
            amount: parseFloat(data.applicant.fee_amount || 500),
            net_due: parseFloat(data.applicant.fee_amount || 500),
            currency: data.applicant.currency || 'BDT',
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

  // Handle successful clearance
  const handlePaymentSuccess = (receipt) => {
    setIsPaid(true);
    toast.success('Application fee confirmed! Advancing to photo upload...');
    setTimeout(() => {
      router.push(`/admission/upload/${id}`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading candidate admission invoice...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Application Not Found</h3>
        <p className="text-xs text-slate-500">
          The requested application reference could not be verified in this institution&apos;s records.
        </p>
        <Link
          href="/pay/admission-fees"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl"
        >
          <FiArrowLeft /> Return to Admission Search
        </Link>
      </div>
    );
  }

  // ALREADY PAID VIEW
  if (isPaid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800/60 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
            <FiCheckCircle />
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              Application Fee Settled
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              Payment Cleared Successfully!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your application fee has been verified. You can now upload your candidate photo and signature to finalize your admission.
            </p>
          </div>

          {/* Candidate Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Applicant:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{applicant.applicant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Application Tracking:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{applicant.application_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Circular:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.circular_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fee Status:</span>
              <span className="font-bold text-emerald-600 uppercase">Paid & Verified</span>
            </div>
          </div>

          <Link
            href={`/admission/upload/${applicant.id}`}
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition"
          >
            <span>Proceed to Upload Candidate Media</span>
            <FiArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  // UNPAID CHECKOUT VIEW
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/pay/admission-fees"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition mb-3"
          >
            <FiArrowLeft /> Back to Admission Fee Search
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <FiUserCheck className="w-3.5 h-3.5" />
            <span>Step 2 of 3: Application Fee Clearance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Complete Application Fee Payment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pay via your preferred payment gateway to unlock candidate photograph and signature upload.
          </p>
        </div>

        {/* Candidate Detail Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Application Tracking
              </span>
              <div className="font-mono text-lg font-black text-slate-900 dark:text-white">
                {applicant.application_no}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Application Fee Payable</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                ৳{invoice ? parseFloat(invoice.net_due || invoice.amount).toFixed(2) : '500.00'} BDT
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Candidate Name:</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm">{applicant.applicant_name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Admission Circular:</span>
              <strong className="text-slate-800 dark:text-slate-200">{applicant.circular_title}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Contact Phone:</span>
              <strong className="text-slate-800 dark:text-slate-200">{applicant.masked_phone || applicant.phone}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Email Address:</span>
              <strong className="text-slate-800 dark:text-slate-200">{applicant.masked_email || applicant.email}</strong>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/25 transition flex items-center justify-center gap-3"
            >
              <FiCreditCard className="w-5 h-5" />
              <span>Select Payment Gateway & Pay ৳{invoice ? parseFloat(invoice.net_due || invoice.amount).toFixed(2) : '500.00'}</span>
            </button>
          </div>
        </div>

        {/* Step Guide */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
            Next Steps in Admission Workflow
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5">
                <FiCheckCircle /> 1. Application Submitted
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Profile & academic records captured.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
              <div className="font-bold flex items-center gap-1.5">
                <FiClock /> 2. Pay Application Fee
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Clear fee via bKash, Nagad, cards.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <div className="font-bold flex items-center gap-1.5">
                <FiLock /> 3. Upload Photo & Sign
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Unlocks immediately after payment.</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
          <FiShield className="text-emerald-500" />
          <span>Payment is instantly credited to candidate application tracking system.</span>
        </div>
      </div>

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

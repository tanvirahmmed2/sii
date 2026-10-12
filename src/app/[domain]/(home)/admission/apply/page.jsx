'use client';

import React, { useState, useEffect, Suspense, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import AdmissionApplyForm from 'src/component/forms/AdmissionApplyForm';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import {
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiArrowRight,
  FiCopy,
  FiAlertCircle,
  FiExternalLink
} from 'react-icons/fi';

const ApplyFormContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const admissionIdParam = searchParams.get('admission_id');
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [circulars, setCirculars] = useState([]);
  const [selectedCircular, setSelectedCircular] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  useEffect(() => {
    const loadCirculars = async () => {
      setLoading(true);
      try {
        const endpoint = getApiEndpoint ? getApiEndpoint('admissions/apply') : '/api/admissions/apply';
        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.circulars) {
          const list = data.circulars;
          setCirculars(list);

          if (admissionIdParam) {
            const found = list.find((c) => c.id.toString() === admissionIdParam);
            if (found) {
              setSelectedCircular(found);
            }
          } else if (list.length > 0) {
            setSelectedCircular(list[0]);
          }
        }
      } catch {
        toast.error('Failed to load admission circulars.');
      } finally {
        setLoading(false);
      }
    };

    loadCirculars();
  }, [admissionIdParam, getApiEndpoint]);

  const handleCircularChange = (id) => {
    const found = circulars.find((c) => c.id.toString() === id);
    setSelectedCircular(found || null);
  };

  const calculateAge = (dobString) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (formValues) => {
    if (!selectedCircular) {
      toast.error('Please select an admission circular target.');
      return;
    }

    const candidateAge = calculateAge(formValues.date_of_birth);
    if (selectedCircular.min_age !== null && candidateAge < selectedCircular.min_age) {
      toast.error(`Candidate age (${candidateAge}) is under target minimum of ${selectedCircular.min_age} years.`);
      return;
    }
    if (selectedCircular.max_age !== null && candidateAge > selectedCircular.max_age) {
      toast.error(`Candidate age (${candidateAge}) exceeds target maximum of ${selectedCircular.max_age} years.`);
      return;
    }

    setSubmitting(true);
    try {
      const postEndpoint = getApiEndpoint ? getApiEndpoint('admissions/apply') : '/api/admissions/apply';
      const res = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circular_id: selectedCircular.id,
          applicant_name: formValues.applicant_name,
          email: formValues.email,
          phone: formValues.phone,
          gender: formValues.gender,
          blood_group: formValues.blood_group,
          date_of_birth: formValues.date_of_birth,
          address: formValues.address,
          father_name: formValues.father_name,
          father_phone: formValues.father_phone,
          mother_name: formValues.mother_name,
          mother_phone: formValues.mother_phone,
          previous_school: formValues.past_school_name,
          previous_gpa: formValues.past_school_result,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Application submitted successfully!');
        setSubmissionSuccess(data);

        // If gateway payment url is returned, redirect after short delay
        if (data.payment?.payment_url) {
          toast.loading('Redirecting to payment gateway...');
          setTimeout(() => {
            window.location.href = data.payment.payment_url;
          }, 1500);
        }
      } else {
        throw new Error(data.error || 'Failed to submit application.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyApplicationNo = () => {
    if (submissionSuccess?.applicant?.application_no) {
      navigator.clipboard.writeText(submissionSuccess.applicant.application_no);
      toast.success('Application Tracking Number copied!');
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[40vh] flex justify-center items-center">
        <div className="loader loader-md" />
      </div>
    );
  }

  // Success view with payment clearance & media upload redirection
  if (submissionSuccess) {
    const app = submissionSuccess.applicant;
    const pay = submissionSuccess.payment;

    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
            <FiCheckCircle />
          </div>
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded uppercase tracking-wider">
            Application Transmitted
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
            Application Received Successfully
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official candidate record generated. An electronic confirmation has been sent to <strong>{app.email}</strong>.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Applicant Tracking Number
              </span>
              <span className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono block">
                {app.application_no}
              </span>
            </div>
            <button
              onClick={copyApplicationNo}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <FiCopy /> Copy
            </button>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p><strong>Candidate Name:</strong> {app.applicant_name}</p>
            <p><strong>Admission Fee:</strong> {parseFloat(app.fee_amount || 0).toFixed(2)} {app.currency || 'BDT'}</p>
            <p>
              <strong>Payment Status:</strong>{' '}
              <span className={`font-bold ${app.payment_status === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {app.payment_status?.toUpperCase() || 'UNPAID'}
              </span>
            </p>
          </div>
        </div>

        {/* Payment Action or Upload Redirection */}
        {pay?.payment_url && app.payment_status !== 'paid' ? (
          <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800 text-left space-y-3">
            <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-semibold text-xs">
              <FiCreditCard className="w-4 h-4" /> Gateway Payment Clearance Required
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To complete your admission application, please proceed to the secure payment portal to settle the admission fee of <strong>{app.fee_amount} {app.currency}</strong>.
            </p>
            <a
              href={pay.payment_url}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
            >
              Pay Now via Payment Gateway <FiArrowRight />
            </a>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-left space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
              <FiCheckCircle className="w-4 h-4" /> Payment Cleared! Next: Candidate Media Upload
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Your application fee has been settled. Please upload your candidate portrait photo (500x500 pixels) and official signature to finalize your admit card.
            </p>
            <Link
              href={`/admission/upload/${app.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
            >
              Upload Photo & Signature <FiArrowRight />
            </Link>
          </div>
        )}

        <div className="pt-2">
          <Link
            href="/admission"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
          >
            ← Return to Admission Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {selectedCircular && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded uppercase tracking-wider">
                Intake Session: {selectedCircular.session_name || 'Academic'}
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {selectedCircular.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Class: <strong>{selectedCircular.class_name}</strong> | Seats: <strong>{selectedCircular.total_seats || 'Open'}</strong>
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Admission Fee</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {parseFloat(selectedCircular.fee_amount || selectedCircular.fees || 0).toFixed(2)}
              </span>{' '}
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                {selectedCircular.fee_currency || selectedCircular.currency || 'BDT'}
              </span>
            </div>
          </div>

          <AdmissionApplyForm
            circulars={circulars}
            selectedCircular={selectedCircular}
            onCircularChange={handleCircularChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            admissionIdParam={admissionIdParam}
          />
        </div>
      )}
    </div>
  );
};

export default function AdmissionApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>
      }
    >
      <ApplyFormContent />
    </Suspense>
  );
}

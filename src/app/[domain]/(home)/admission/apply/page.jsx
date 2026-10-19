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
import { motion } from 'framer-motion';

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
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-10 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6"
        >
          <div>
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              <FiCheckCircle />
            </div>
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary bg-primary/10 border border-primary/20 px-3.5 py-1 rounded-full inline-block">
              Application Transmitted
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white mt-3 tracking-tight">
              Application Received Successfully
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Official candidate record generated. An electronic confirmation has been sent to <strong>{app.email}</strong>.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Applicant Tracking Number
                </span>
                <span className="text-xl font-bold text-primary font-mono block mt-0.5">
                  {app.application_no}
                </span>
              </div>
              <button
                onClick={copyApplicationNo}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiCopy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
              <p><strong>Candidate Name:</strong> {app.applicant_name}</p>
              <p><strong>Admission Fee:</strong> ৳{parseFloat(app.fee_amount || 0).toFixed(2)} {app.currency || 'BDT'}</p>
              <p>
                <strong>Payment Status:</strong>{' '}
                <span className={`font-semibold ${app.payment_status === 'paid' ? 'text-primary' : 'text-secondary'}`}>
                  {app.payment_status?.toUpperCase() || 'UNPAID'}
                </span>
              </p>
            </div>
          </div>

          {/* Payment Action or Upload Redirection */}
          {app.payment_status !== 'paid' ? (
            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 text-left space-y-3.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                <FiCreditCard className="w-4 h-4 text-primary" /> Admission Fee Payment Required
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To complete your admission application, please proceed to pay the application fee of <strong>৳{app.fee_amount || 500} {app.currency || 'BDT'}</strong> via our secure payment gateway.
              </p>
              <Link
                href={pay?.payment_url || `/pay/admission-fees/${app.id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                Pay Now via Payment Gateway <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="p-6 bg-primary/10 rounded-2xl border border-primary/30 text-left space-y-3.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                <FiCheckCircle className="w-4 h-4 text-primary" /> Payment Cleared! Next: Candidate Media Upload
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your application fee has been settled. Please upload your candidate portrait photo (300x300 pixels) and official signature (150x50 pixels) to finalize your admission application.
              </p>
              <Link
                href={`/admission/upload/${app.id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                Upload Photo & Signature <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="pt-2">
            <Link
              href="/admission"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              ← Return to Admission Portal
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {selectedCircular && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
              <div className="space-y-1.5">
                <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full inline-block">
                  Intake Session: {selectedCircular.session_name || 'Academic'}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                  {selectedCircular.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Class: <strong>{selectedCircular.class_name}</strong> | Seats: <strong>{selectedCircular.total_seats || 'Open'}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Admission Fee</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  ৳{parseFloat(selectedCircular.fee_amount || selectedCircular.fees || 0).toFixed(2)}
                </span>{' '}
                <span className="text-xs font-semibold text-primary">
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
          </motion.div>
        )}
      </div>
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

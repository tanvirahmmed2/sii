'use client';

import React, { useState, useEffect, Suspense, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import AdmissionApplyForm from 'src/component/forms/AdmissionApplyForm';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ApplyFormContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const admissionIdParam = searchParams.get('admission_id');
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [circulars, setCirculars] = useState([]);
  const [selectedCircular, setSelectedCircular] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadCirculars = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint('admin/admissions'));
        const data = await res.json();
        if (data.success && data.paylod?.circulars) {
          const list = data.paylod.circulars;
          setCirculars(list);

          if (admissionIdParam) {
            const found = list.find((c) => c.id.toString() === admissionIdParam);
            if (found) {
              setSelectedCircular(found);
            }
          }
        }
      } catch {
        toast.error('Failed to load admission options.');
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
      const res = await fetch(getApiEndpoint('admin/students/admissions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formValues,
          admission_id: selectedCircular.id
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Application submitted! Receipt sent to candidate email.');
        setReceiptData({
          applicantNumber: data.paylod?.applicant_number || `APP-1000${data.paylod?.admission?.id}`,
          applicantName: formValues.applicant_name,
          email: formValues.email,
          circularTitle: selectedCircular.title,
          feeAmount: data.paylod?.fee_amount || selectedCircular.fees || 0
        });
      } else {
        throw new Error(data.error || 'Failed to submit application.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyReceiptNumber = () => {
    if (receiptData?.applicantNumber) {
      navigator.clipboard.writeText(receiptData.applicantNumber);
      toast.success('Applicant Number copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[40vh] flex flex-col items-center justify-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Preparing intake application form...</span>
      </div>
    );
  }

  if (receiptData) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded p-6 sm:p-8 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded uppercase tracking-wider">
            Application Transmitted
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
            Official Application Receipt
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            An electronic confirmation has been dispatched to <strong>{receiptData.email}</strong>.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Applicant Tracking Number
              </span>
              <span className="text-lg font-semibold text-primary font-mono block">
                {receiptData.applicantNumber}
              </span>
            </div>
            <button
              onClick={copyReceiptNumber}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
            >
              Copy
            </button>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p><strong>Candidate:</strong> {receiptData.applicantName}</p>
            <p><strong>Circular:</strong> {receiptData.circularTitle}</p>
            <p><strong>Admission Fee:</strong> ৳{parseFloat(receiptData.feeAmount).toFixed(2)}</p>
            <p>
              <strong>Payment Status:</strong>{' '}
              <span className="text-rose-600 dark:text-rose-400 font-medium">UNPAID</span>
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <span className="font-semibold block">Next Step: Fee Clearance</span>
          <p className="leading-relaxed text-[11px]">
            Please visit the cashier desk with Applicant Number ({receiptData.applicantNumber}) to clear the application fee. Once settled, you will receive an invitation to upload your candidate photo and signature.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={tenantUrl('/admission')}
            className="inline-block px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium text-xs rounded transition-colors"
          >
            ← Return to Admission Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {selectedCircular ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-primary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Class: {selectedCircular.class_name}
              </span>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {selectedCircular.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>Deadline: <strong className="text-slate-800 dark:text-slate-200 font-medium">{new Date(selectedCircular.finish_date).toLocaleDateString()}</strong></span>
                {selectedCircular.fees !== undefined && selectedCircular.fees !== null && (
                  <span>Admission Fee: <strong className="text-primary font-medium">৳{parseFloat(selectedCircular.fees).toFixed(2)}</strong></span>
                )}
                {selectedCircular.monthly_fee !== undefined && selectedCircular.monthly_fee !== null && parseFloat(selectedCircular.monthly_fee) > 0 && (
                  <span>Monthly Tuition: <strong className="text-slate-800 dark:text-slate-200 font-medium">৳{parseFloat(selectedCircular.monthly_fee).toFixed(2)}</strong></span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium text-xs rounded transition-colors cursor-pointer shrink-0"
            >
              {showForm ? 'Hide Form' : 'Fill Application'}
            </button>
          </div>

          {selectedCircular.description && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Requirements & Details
              </span>
              <div
                className="prose dark:prose-invert max-w-none text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-700"
                dangerouslySetInnerHTML={{ __html: selectedCircular.description }}
              />
            </div>
          )}
        </div>
      ) : null}

      {(!selectedCircular || showForm) && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Candidate Application Registration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter candidate particulars and parental guardian details.
              </p>
            </div>

            {selectedCircular && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium"
              >
                Close Form
              </button>
            )}
          </div>

          <AdmissionApplyForm
            circulars={circulars}
            selectedCircular={selectedCircular}
            onCircularChange={handleCircularChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            admissionIdParam={admissionIdParam}
            onGoBack={() => router.push(tenantUrl('/admission'))}
          />
        </div>
      )}
    </div>
  );
};

const ApplyPage = () => {
  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block mb-1">
            Enrollment Gateway
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Candidate Admission Application
          </h1>
        </div>

        <Suspense fallback={
          <div className="w-full min-h-[40vh] flex items-center justify-center">
            <span className="text-xs font-medium text-slate-500">Loading form...</span>
          </div>
        }>
          <ApplyFormContent />
        </Suspense>
      </div>
    </div>
  );
};

export default ApplyPage;

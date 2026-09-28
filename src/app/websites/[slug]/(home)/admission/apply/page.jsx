'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiFileText, FiCheckCircle, FiCopy, FiMail, FiDollarSign, FiArrowLeft, FiLayers, FiClock, FiCalendar, FiEdit3 } from 'react-icons/fi';
import Link from 'next/link';
import AdmissionApplyForm from '@/component/forms/AdmissionApplyForm';
import { SCHOOL_NAME } from '@/lib/secret';

const ApplyFormContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const admissionIdParam = searchParams.get('admission_id');

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
        const res = await fetch('/api/admin/admissions');
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
      } catch (err) {
        toast.error('Failed to load admission options.');
      } finally {
        setLoading(false);
      }
    };

    loadCirculars();
  }, [admissionIdParam]);

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
      const res = await fetch('/api/admin/students/admissions', {
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
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Preparing application form...</span>
      </div>
    );
  }

  if (receiptData) {
    return (
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] text-center animate-scale-up border border-slate-100">
        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
          <FiCheckCircle />
        </div>

        <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider">
          Application Submitted
        </span>

        <h2 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
          Application Receipt
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          A receipt has been dispatched to <strong>{receiptData.email}</strong>.
        </p>

        <div className="my-6 bg-slate-50 p-5 rounded-2xl border border-slate-150 text-left flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applicant Number</p>
              <p className="text-xl font-semibold text-primary font-mono mt-0.5">{receiptData.applicantNumber}</p>
            </div>
            <button
              onClick={copyReceiptNumber}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <FiCopy /> Copy
            </button>
          </div>

          <div className="text-xs text-slate-700 flex flex-col gap-1.5 pt-1">
            <p><strong>Candidate:</strong> {receiptData.applicantName}</p>
            <p><strong>Circular:</strong> {receiptData.circularTitle}</p>
            <p><strong>Admission Fee:</strong> <span className="text-green-600 font-bold">BDT {parseFloat(receiptData.feeAmount).toFixed(2)}</span></p>
            <p><strong>Payment Status:</strong> <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full text-[10px]">UNPAID</span></p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left mb-6">
          <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
            <FiDollarSign className="text-amber-600" /> Next Step: Visit Cashier Office
          </h4>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Please visit the institution cashier office with your <strong>Applicant Number ({receiptData.applicantNumber})</strong> to complete your fee payment. Upon payment, you will receive an email to upload your profile photo and signature.
          </p>
        </div>

        <Link
          href="/admission"
          className="inline-flex items-center justify-center gap-1.5 w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
        >
          <FiArrowLeft /> Return to Admission Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {selectedCircular ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full mb-2">
                <FiLayers /> Class: {selectedCircular.class_name}
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">{selectedCircular.title}</h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 font-semibold mt-3">
                <div className="flex items-center gap-1.5">
                  <FiClock className="text-slate-400" />
                  <span>Deadline: <strong className="text-slate-700">{new Date(selectedCircular.finish_date).toLocaleDateString()}</strong></span>
                </div>
                {selectedCircular.min_age !== null || selectedCircular.max_age !== null ? (
                  <div className="flex items-center gap-1.5">
                    <FiCalendar className="text-slate-400" />
                    <span>Age limits: <strong className="text-slate-700">{selectedCircular.min_age || 0} to {selectedCircular.max_age || '∞'} years</strong></span>
                  </div>
                ) : null}
                {selectedCircular.fees !== undefined && selectedCircular.fees !== null && (
                  <div className="flex items-center gap-1.5 text-primary">
                    <FiDollarSign className="text-primary" />
                    <span>Admission Fee: <strong className="text-primary font-bold">BDT {parseFloat(selectedCircular.fees).toFixed(2)}</strong></span>
                  </div>
                )}
                {selectedCircular.monthly_fee !== undefined && selectedCircular.monthly_fee !== null && parseFloat(selectedCircular.monthly_fee) > 0 && (
                  <div className="flex items-center gap-1.5 text-sky-700">
                    <FiDollarSign className="text-sky-600" />
                    <span>Monthly Fee: <strong className="text-sky-800 font-bold">BDT {parseFloat(selectedCircular.monthly_fee).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <FiEdit3 className="text-sm" />
              <span>{showForm ? 'Hide Application Form' : 'Fill Application Form'}</span>
            </button>
          </div>

          {selectedCircular.description && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Detailed Circular Information &amp; Requirements</h4>
              <div
                className="prose prose-sm max-w-none text-xs text-slate-650 leading-relaxed font-normal bg-slate-50/70 p-4 rounded-2xl border border-slate-100"
                dangerouslySetInnerHTML={{ __html: selectedCircular.description }}
              />
            </div>
          )}
        </div>
      ) : null}

      {(!selectedCircular || showForm) && (
        <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] animate-fade-down">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center text-xl">
                <FiFileText />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Admission Registration Form</h2>
                <p className="text-xs text-slate-400">Fill in the candidate&apos;s profile credentials.</p>
              </div>
            </div>

            {selectedCircular && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hide Form
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
            onGoBack={() => router.push('/admission')}
          />
        </div>
      )}
    </div>
  );
};

const ApplyPage = () => {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="text-center mb-8">
          
          <h1 className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
            Intake Application Registry
          </h1>
        </div>

        <Suspense fallback={
          <div className="w-full min-h-[40vh] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <ApplyFormContent />
        </Suspense>
      </div>
    </div>
  );
};

export default ApplyPage;

'use client';

import React, { useState, useEffect, Suspense, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import AdmissionApplyForm from 'src/component/forms/AdmissionApplyForm';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { validateImageDimensions } from 'src/lib/imageResizer';
import {
  FiCheckCircle,
  FiCreditCard,
  FiArrowRight,
  FiCopy,
  FiAlertCircle,
  FiPrinter,
  FiFileText,
  FiUpload,
  FiAward,
  FiCalendar,
  FiUser
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const ApplyFlowContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const admissionIdParam = searchParams.get('admission_id') || searchParams.get('circular_id');
  const urlEmail = searchParams.get('email') || '';
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [circulars, setCirculars] = useState([]);
  const [selectedCircular, setSelectedCircular] = useState(null);
  const [loading, setLoading] = useState(true);

  // Flow Step: 'form' | 'payment' | 'upload' | 'completed'
  const [currentStep, setCurrentStep] = useState('form');
  const [activeApplicant, setActiveApplicant] = useState(null);

  // Submission & Payment state
  const [submittingForm, setSubmittingForm] = useState(false);
  const [clearingPayment, setClearingPayment] = useState(false);
  const [paymentTxnId, setPaymentTxnId] = useState('');

  // Upload state
  const [photoPreview, setPhotoPreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Load circulars on mount
  useEffect(() => {
    const loadCirculars = async () => {
      setLoading(true);
      try {
        const endpoint = getApiEndpoint ? getApiEndpoint('admissions/apply') : '/api/admissions/apply';
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (data.success && data.circulars) {
          const list = data.circulars;
          setCirculars(list);

          if (admissionIdParam) {
            const found = list.find((c) => String(c.id) === String(admissionIdParam));
            if (found) setSelectedCircular(found);
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

  // Handle circular change
  const handleCircularChange = (id) => {
    const found = circulars.find((c) => String(c.id) === String(id));
    setSelectedCircular(found || null);
  };

  // Resume existing applicant if found during email check
  const handleResumeExisting = ({ step, applicant }) => {
    setActiveApplicant(applicant);
    if (applicant.photo_url) setPhotoPreview(applicant.photo_url);
    if (applicant.signature_url) setSignaturePreview(applicant.signature_url);

    if (step === 'payment') {
      setCurrentStep('payment');
    } else if (step === 'upload') {
      setCurrentStep('upload');
    } else if (step === 'completed') {
      setCurrentStep('completed');
    }
  };

  // Step 2: Information form submission -> sets status to 'unpaid'
  const handleFormSubmit = async (formValues) => {
    if (!selectedCircular) {
      toast.error('Please select an admission circular target.');
      return;
    }

    setSubmittingForm(true);
    try {
      const postEndpoint = getApiEndpoint ? getApiEndpoint('admissions/apply') : '/api/admissions/apply';
      const res = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admission_id: selectedCircular.id,
          applicant_name: formValues.applicant_name,
          email: formValues.email,
          phone: formValues.phone,
          gender: formValues.gender,
          blood_group: formValues.blood_group,
          date_of_birth: formValues.date_of_birth,
          address: formValues.address,
          present_address: formValues.address,
          father_name: formValues.father_name,
          father_phone: formValues.father_phone,
          father_occupation: formValues.father_occupation,
          mother_name: formValues.mother_name,
          mother_phone: formValues.mother_phone,
          mother_occupation: formValues.mother_occupation,
          guardian_name: formValues.guardian_name || formValues.father_name,
          guardian_phone: formValues.guardian_phone || formValues.father_phone,
          guardian_relation: formValues.guardian_relation || 'Father',
          last_class: formValues.past_school_class,
          last_class_grade: formValues.past_school_result,
          last_institution: formValues.past_school_name
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.applicant) {
        toast.success('Application profile recorded! Please proceed with payment.');
        setActiveApplicant({
          ...data.applicant,
          id: data.applicant.id || data.applicant_id,
          fee_amount: data.fee_amount || selectedCircular.fee_amount,
          fee_currency: data.fee_currency || selectedCircular.fee_currency || 'BDT',
          circular_title: selectedCircular.title,
          class_name: selectedCircular.class_name,
          selection_method: selectedCircular.selection_method
        });
        setCurrentStep('payment');
      } else {
        throw new Error(data.error || 'Failed to submit application.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Step 3: Clear Fee Payment -> sets status to 'paid'
  const handlePaymentClearance = async (gatewayCode = 'online') => {
    if (!activeApplicant) return;

    setClearingPayment(true);
    try {
      const payEndpoint = getApiEndpoint ? getApiEndpoint('admissions/pay') : '/api/admissions/pay';
      const txn = paymentTxnId.trim() || `TXN-ADM-${Date.now()}`;

      const res = await fetch(payEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: activeApplicant.id,
          email: activeApplicant.email,
          gateway_code: gatewayCode,
          transaction_id: txn
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Fee payment confirmed! Please upload photo and signature.');
        setActiveApplicant((prev) => ({
          ...prev,
          status: 'paid',
          payment_status: 'paid',
          transaction_id: txn
        }));
        setCurrentStep('upload');
      } else {
        throw new Error(data.error || 'Failed to process fee payment.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClearingPayment(false);
    }
  };

  // Step 4: Photo & Signature Selection
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Str = await validateImageDimensions(file, 300, 300, 'Candidate Photo');
      setPhotoPreview(base64Str);
      toast.success('Candidate portrait verified (300x300 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Str = await validateImageDimensions(file, 150, 50, 'Candidate Signature');
      setSignaturePreview(base64Str);
      toast.success('Candidate signature verified (150x50 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
    }
  };

  // Step 4: Upload Media -> sets status to 'completed' and generates exam_roll if exam-based
  const handleCompleteUpload = async () => {
    if (!activeApplicant) return;

    if (!photoPreview) {
      toast.error('Please upload candidate portrait photo (300x300 px).');
      return;
    }
    if (!signaturePreview) {
      toast.error('Please upload official signature (150x50 px).');
      return;
    }

    setUploadingMedia(true);
    try {
      const uploadEndpoint = getApiEndpoint ? getApiEndpoint('admissions/upload') : '/api/admissions/upload';
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: activeApplicant.id,
          photo: photoPreview,
          signature: signaturePreview
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Application completed successfully!');
        setActiveApplicant((prev) => ({
          ...prev,
          status: 'completed',
          exam_roll: data.exam_roll || prev.exam_roll,
          roll_no: data.exam_roll || prev.roll_no,
          photo_url: data.photo_url || photoPreview,
          signature_url: data.signature_url || signaturePreview
        }));
        setCurrentStep('completed');
      } else {
        throw new Error(data.error || 'Failed to upload candidate documents.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  const copyTrackingNo = () => {
    if (activeApplicant?.application_no) {
      navigator.clipboard.writeText(activeApplicant.application_no);
      toast.success('Application Tracking Number copied!');
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Progress Stepper Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className={`p-2 rounded-xl transition ${currentStep === 'form' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800' : 'text-slate-400'}`}>
              <span className="block text-[10px] uppercase tracking-wider">Step 1</span>
              <span>Profile Info</span>
            </div>
            <div className={`p-2 rounded-xl transition ${currentStep === 'payment' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800' : 'text-slate-400'}`}>
              <span className="block text-[10px] uppercase tracking-wider">Step 2</span>
              <span>Fee Payment</span>
            </div>
            <div className={`p-2 rounded-xl transition ${currentStep === 'upload' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800' : 'text-slate-400'}`}>
              <span className="block text-[10px] uppercase tracking-wider">Step 3</span>
              <span>Photo &amp; Signature</span>
            </div>
            <div className={`p-2 rounded-xl transition ${currentStep === 'completed' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-400'}`}>
              <span className="block text-[10px] uppercase tracking-wider">Step 4</span>
              <span>Summary Slip</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Candidate Application Form */}
        {currentStep === 'form' && selectedCircular && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
              <div className="space-y-1.5">
                <span className="text-xs uppercase tracking-[0.25em] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full inline-block">
                  Intake Session: {selectedCircular.session_name || 'Academic'}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                  {selectedCircular.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Target Class: <strong>{selectedCircular.class_name}</strong> | Selection: <strong className="uppercase">{selectedCircular.selection_method || 'manual'} Based</strong>
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Admission Fee</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  ৳{parseFloat(selectedCircular.fee_amount || 500).toFixed(2)}
                </span>{' '}
                <span className="text-xs font-semibold text-blue-600">
                  {selectedCircular.fee_currency || 'BDT'}
                </span>
              </div>
            </div>

            <AdmissionApplyForm
              circulars={circulars}
              selectedCircular={selectedCircular}
              onCircularChange={handleCircularChange}
              onSubmit={handleFormSubmit}
              submitting={submittingForm}
              admissionIdParam={admissionIdParam}
              onResumeExisting={handleResumeExisting}
            />
          </motion.div>
        )}

        {/* STEP 2: Fee Payment Card */}
        {currentStep === 'payment' && activeApplicant && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto text-xl">
                <FiCreditCard />
              </div>
              <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                Application Fee Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Candidate record registered. Please complete the application fee payment to proceed to photo &amp; signature upload.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500">Application Tracking:</span>
                <span className="font-mono font-bold text-sm text-blue-600">{activeApplicant.application_no}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Candidate Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeApplicant.applicant_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Contact Email:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{activeApplicant.email}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-500 font-bold">Total Application Fee:</span>
                <span className="font-mono font-bold text-lg text-emerald-600">
                  ৳{parseFloat(activeApplicant.fee_amount || 500).toFixed(2)} {activeApplicant.fee_currency || 'BDT'}
                </span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Gateway / Payment Reference:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter Online Transaction ID / Ref (e.g. TXN-123456) or leave auto"
                    value={paymentTxnId}
                    onChange={(e) => setPaymentTxnId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePaymentClearance('online')}
                  disabled={clearingPayment}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {clearingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Fee Settlement...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Confirm &amp; Clear Payment (৳{parseFloat(activeApplicant.fee_amount || 500).toFixed(2)}) &rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Photo & Signature Upload Card */}
        {currentStep === 'upload' && activeApplicant && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-full flex items-center justify-center mx-auto text-xl">
                <FiUpload />
              </div>
              <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                Upload Candidate Photo &amp; Signature
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Payment verified! Please upload your candidate portrait and official signature to finalize your admission and receive your roll number.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Input (300x300 px) */}
              <div className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-850/50">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  1. Candidate Portrait (300 &times; 300 px) *
                </span>
                <div className="w-32 h-32 mx-auto border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Photo Preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">Square Photo</span>
                  )}
                </div>
                <label className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs">
                  <span>Choose Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-400">Supported: JPG, PNG. Strict 300x300 px.</p>
              </div>

              {/* Signature Input (150x50 px) */}
              <div className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-850/50">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  2. Official Signature (150 &times; 50 px) *
                </span>
                <div className="w-44 h-16 mx-auto border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  {signaturePreview ? (
                    <Image
                      src={signaturePreview}
                      alt="Signature Preview"
                      width={176}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">150x50 Signature</span>
                  )}
                </div>
                <label className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs">
                  <span>Choose Signature</span>
                  <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-400">Supported: JPG, PNG. Strict 150x50 px.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCompleteUpload}
                disabled={uploadingMedia || !photoPreview || !signaturePreview}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploadingMedia ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading Documents &amp; Finalizing Intake...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Save &amp; Complete Application &rarr;</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Application Completion & Printable Slip */}
        {currentStep === 'completed' && activeApplicant && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Top Bar Actions (Hidden in Print) */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <FiCheckCircle className="text-emerald-600 w-5 h-5" />
                <span>Application Submitted Successfully &bull; Status: COMPLETED</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FiPrinter className="w-3.5 h-3.5" /> Print Slip
                </button>
                {activeApplicant.selection_method === 'exam' && (
                  <Link
                    href={`/admission/admit-card?query=${encodeURIComponent(activeApplicant.application_no)}`}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                  >
                    <FiFileText className="w-3.5 h-3.5" /> Download Admit Card
                  </Link>
                )}
                <Link
                  href="/admission/results"
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <FiAward className="w-3.5 h-3.5" /> View Results
                </Link>
              </div>
            </div>

            {/* CONFIRMATION SLIP SHEET */}
            <div className="bg-white text-slate-900 border-2 border-slate-900 rounded-2xl p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
              {/* Slip Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <span className="text-xs uppercase tracking-widest font-bold text-slate-500 block">
                    Official Admission Confirmation Slip
                  </span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900 mt-1">
                    {activeApplicant.circular_title || selectedCircular?.title || 'Academic Admission'}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Class: {activeApplicant.class_name || selectedCircular?.class_name || 'General'} &bull; Status: COMPLETED
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold uppercase rounded">
                    PAID &amp; COMPLETED
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Identity & Roll Grid */}
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-8 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Application Tracking No</span>
                      <span className="font-mono font-bold text-base text-blue-700">{activeApplicant.application_no}</span>
                    </div>
                    {activeApplicant.exam_roll && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Exam Roll</span>
                        <span className="font-mono font-bold text-base text-purple-700">{activeApplicant.exam_roll}</span>
                      </div>
                    )}
                  </div>

                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1 font-bold text-slate-500 w-32">Candidate:</td>
                        <td className="py-1 font-semibold text-slate-900 uppercase">{activeApplicant.applicant_name}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-slate-500">Email:</td>
                        <td className="py-1 font-mono text-slate-800">{activeApplicant.email}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-slate-500">Contact Phone:</td>
                        <td className="py-1 font-mono text-slate-800">{activeApplicant.phone}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-slate-500">Fee Payment:</td>
                        <td className="py-1 font-bold text-emerald-700">
                          ৳{parseFloat(activeApplicant.fee_amount || 500).toFixed(2)} {activeApplicant.fee_currency || 'BDT'} (PAID)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Candidate Media Preview */}
                <div className="col-span-4 flex flex-col items-center gap-2">
                  <div className="w-24 h-24 border border-slate-300 rounded bg-slate-100 overflow-hidden flex items-center justify-center">
                    {photoPreview ? (
                      <Image
                        src={photoPreview}
                        alt="Photo"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400">Photo</span>
                    )}
                  </div>
                  <div className="w-28 h-8 border border-slate-300 rounded bg-slate-50 overflow-hidden flex items-center justify-center">
                    {signaturePreview ? (
                      <Image
                        src={signaturePreview}
                        alt="Signature"
                        width={112}
                        height={32}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400">Signature</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-600">
                <span className="font-bold text-slate-800 uppercase block">Intake Notice:</span>
                <p>
                  Your admission application is officially registered. Preserve this slip and your tracking number for future verification. If this admission is exam-based, your admit card can be printed from the portal on or before the scheduled examination date.
                </p>
              </div>
            </div>
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
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ApplyFlowContent />
    </Suspense>
  );
}

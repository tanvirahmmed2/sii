'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { validateImageDimensions } from 'src/lib/imageResizer';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import {
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
  FiPrinter,
  FiArrowRight,
  FiFileText,
  FiUser,
  FiCalendar,
  FiLock,
  FiCreditCard
} from 'react-icons/fi';

export default function CandidateUploadPage() {
  const params = useParams();
  const id = params?.id;
  const domain = params?.domain || '';
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [imagePreview, setImagePreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');

  const uploadEndpoint = getApiEndpoint ? getApiEndpoint('admissions/upload') : (domain ? `/api/${domain}/admissions/upload` : '/api/admissions/upload');

  useEffect(() => {
    if (!id) return;

    const fetchApplicant = async () => {
      try {
        const res = await fetch(`${uploadEndpoint}?id=${id}`);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.applicant) {
          const app = data.applicant;
          setApplicant(app);
          if (app.photo_url || app.image) setImagePreview(app.photo_url || app.image);
          if (app.signature_url || app.signature) setSignaturePreview(app.signature_url || app.signature);
          if ((app.photo_url || app.image) && (app.signature_url || app.signature)) {
            setSubmitted(true);
          }
        } else {
          toast.error(data.error || 'Applicant record not found.');
        }
      } catch (err) {
        console.error('Error fetching applicant:', err);
        toast.error('Failed to load applicant details.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplicant();
  }, [id]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Str = await validateImageDimensions(file, 300, 300, 'Candidate Photo');
      setImagePreview(base64Str);
      toast.success('Candidate photo dimensions verified (300x300 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
    }
  };

  const handleSignatureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Str = await validateImageDimensions(file, 150, 50, 'Candidate Signature');
      setSignaturePreview(base64Str);
      toast.success('Candidate signature dimensions verified (150x50 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imagePreview) {
      toast.error('Please upload candidate profile photo (300x300 px).');
      return;
    }
    if (!signaturePreview) {
      toast.error('Please upload candidate signature (150x50 px).');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(id, 10),
          photo: imagePreview,
          signature: signaturePreview,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Candidate documents uploaded successfully!');
        setSubmitted(true);
      } else {
        toast.error(data.error || 'Failed to submit candidate media.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during media upload.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Validating candidate admission state...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <FiAlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900 dark:text-white">Applicant Not Found</h3>
        <p className="text-xs text-slate-500">
          The requested application ID does not correspond to any active intake record.
        </p>
        <Link
          href="/admission"
          className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded"
        >
          Return to Admission Portal
        </Link>
      </div>
    );
  }

  // Payment clearance enforcement
  if (applicant.payment_status !== 'paid') {
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-4 text-center">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl">
          <FiCreditCard />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Application Fee Clearance Required
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Candidate photo and signature upload is unlocked strictly after application fee clearance.
          Current Status: <strong className="text-rose-600 uppercase font-mono">{applicant.payment_status}</strong>.
        </p>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs text-left space-y-1">
          <div><strong>Candidate:</strong> {applicant.applicant_name}</div>
          <div><strong>Application Tracking No:</strong> <span className="font-mono font-bold text-sky-600">{applicant.application_no}</span></div>
          <div><strong>Circular:</strong> {applicant.circular_title}</div>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/admission/payment/${applicant.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition"
          >
            <FiCreditCard />
            <span>Go to Payment Gateway</span>
          </Link>
        </div>
      </div>
    );
  }

  // Final Confirmed Application Slip / Admit Card
  if (submitted) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Application & Admit Card Slip
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">
                Tracking: {applicant.application_no}
              </span>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition cursor-pointer"
          >
            <FiPrinter className="w-3.5 h-3.5" /> Print Admit Slip
          </button>
        </div>

        {/* Admit Slip Layout */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-xs text-left">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Candidate Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{applicant.applicant_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Class & Session</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.class_name || 'Academic Class'} ({applicant.session_name || '2026-2027'})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Applicant Roll Number</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{applicant.roll_no || 'Pending Examination Roll'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Evaluation Status</span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                  {applicant.status?.toUpperCase() || 'UNDER REVIEW'}
                </span>
              </div>
            </div>

            {/* Photos and Signatures */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <img
                  src={imagePreview}
                  alt="Candidate 300x300"
                  className="w-28 h-28 object-cover rounded-lg border-2 border-slate-300 dark:border-slate-600 shadow-2xs"
                />
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">Photo (300x300)</span>
              </div>
              <div className="text-center">
                <img
                  src={signaturePreview}
                  alt="Candidate Signature"
                  className="h-7 max-w-[150px] object-contain border border-slate-300 dark:border-slate-600 bg-white p-0.5 rounded shadow-2xs"
                />
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Official Signature (150x50)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2">
          <Link
            href="/admission/results"
            className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
          >
            Check Merit Results Online <FiArrowRight />
          </Link>
          <Link
            href="/admission"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← Return to Admission Portal
          </Link>
        </div>
      </div>
    );
  }

  // Upload Form
  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div>
        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded uppercase tracking-wider">
          Step 2 of 2: Media Upload
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">
          Candidate Photo & Signature Verification
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Candidate: <strong>{applicant.applicant_name}</strong> | Tracking: <span className="font-mono">{applicant.application_no}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Photo Upload: 300x300 */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-xs">
              Candidate Photo * (Strictly 300 × 300 Pixels)
            </span>
            <span className="text-[10px] text-sky-600 font-mono font-semibold">Square Aspect 1:1</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-28 h-28 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-800">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="300x300 Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handlePhotoChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Please upload a front-facing studio portrait. The system strictly checks image dimensions for exactly 300px width and 300px height.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Upload: 150x50 */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-xs">
              Candidate Signature * (Strictly 150 × 50 Pixels)
            </span>
            <span className="text-[10px] text-sky-600 font-mono font-semibold">Aspect 3:1</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-36 h-12 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white p-1">
              {signaturePreview ? (
                <img
                  src={signaturePreview}
                  alt="150x50 Signature Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-slate-400 italic">Signature</span>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleSignatureChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Sign on white paper, scan/crop to exactly 150px width and 50px height with crisp contrast.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admission"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold text-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            <FiUploadCloud className="w-4 h-4" />
            {uploading ? 'Verifying & Uploading...' : 'Finalize & Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}

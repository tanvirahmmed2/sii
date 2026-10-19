'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { validateImageDimensions } from 'src/lib/imageResizer';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

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
  }, [id, uploadEndpoint]);

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
      toast.error('Please upload your photo (300x300 px).');
      return;
    }
    if (!signaturePreview) {
      toast.error('Please upload your signature (150x50 px).');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          photo: imagePreview,
          signature: signaturePreview
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload documents.');
      }

      toast.success('Documents uploaded and application confirmed!');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-2 text-slate-500">
        <div className="text-xs font-mono">Loading applicant details...</div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-xs">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold px-3 py-1 rounded-full border bg-secondary/10 text-secondary border-secondary/20 inline-block">
            Not Found
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white mt-2">
            Applicant Record Not Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The requested application ID does not correspond to any active intake record.
          </p>
          <div className="pt-3">
            <Link
              href="/admission"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:text-primary font-medium text-xs sm:text-sm transition-all inline-block shadow-xs hover:-translate-y-0.5"
            >
              &larr; Return to Admission Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Payment clearance enforcement
  if (applicant.payment_status !== 'paid') {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 sm:p-10 space-y-5 text-center shadow-xs">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] font-semibold px-3.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 inline-block">
              Fee Clearance Required
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white mt-3 tracking-tight">
              Application Fee Clearance Required
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Candidate photo and signature upload is unlocked strictly after application fee clearance.
              Current Status: <span className="font-mono font-semibold text-secondary uppercase">{applicant.payment_status}</span>.
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 text-xs sm:text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Candidate:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.applicant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Application Tracking:</span>
              <span className="font-mono font-semibold text-primary">{applicant.application_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Circular:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.circular_title}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/pay/admission-fees/${applicant.id}`}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-xs sm:text-sm shadow-xs hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 transition-all inline-block"
            >
              Go to Payment Gateway &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Final Confirmed Application Slip / Admit Card
  if (submitted) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold px-3 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                  Application Verified
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  #{applicant.application_no}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                Application &amp; Admit Card Slip
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:text-primary font-medium text-xs transition-all cursor-pointer self-start sm:self-auto shadow-xs hover:-translate-y-0.5"
            >
              Print Admit Slip
            </button>
          </div>

          {/* Identification Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-col items-center justify-center p-3 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Candidate"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">Photo</div>
              )}
              <span className="text-[10px] text-slate-400 mt-1.5 font-mono">300 × 300 px</span>
            </div>

            <div className="md:col-span-2 space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Candidate Name</span>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{applicant.applicant_name}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Circular Applied</span>
                <div className="text-slate-700 dark:text-slate-300">{applicant.circular_title}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Roll No</span>
                  <div className="font-mono font-semibold text-primary">{applicant.roll_no || 'Assigned on Schedule'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Fee Status</span>
                  <div className="font-mono font-semibold text-primary uppercase">Paid</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-3 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              {signaturePreview ? (
                <img
                  src={signaturePreview}
                  alt="Signature"
                  className="w-28 h-10 object-contain"
                />
              ) : (
                <div className="w-28 h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-slate-400">Signature</div>
              )}
              <span className="text-[10px] text-slate-400 mt-1.5 font-mono">Candidate Signature</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <Link
              href="/admission"
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium"
            >
              &larr; Return to Admission Portal
            </Link>
            <Link
              href={tenantUrl ? tenantUrl('/admission/results') : '/admission/results'}
              className="text-primary hover:underline font-medium"
            >
              Check Merit Rankings &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Upload Form
  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold px-3 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                Step 3 of 3: Media Upload
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500">
                Tracking: {applicant.application_no}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
              Candidate Photo &amp; Signature Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Candidate: <strong className="font-medium text-slate-800 dark:text-slate-200">{applicant.applicant_name}</strong> | Circular: {applicant.circular_title}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Photo Upload: 300x300 */}
          <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Candidate Photograph (Strictly 300 × 300 Pixels)
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">Square 1:1</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="300x300 Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">Photo 1:1</span>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Front-facing studio portrait. System validates exact 300px width and 300px height.
                </p>
              </div>
            </div>
          </div>

          {/* Signature Upload: 150x50 */}
          <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Candidate Signature (Strictly 150 × 50 Pixels)
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">Aspect 3:1</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-32 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 p-1">
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

              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleSignatureChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign on plain white paper and crop to exactly 150px width and 50px height.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <Link
              href="/admission"
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs hover:border-primary/50 hover:text-primary transition-all shadow-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium text-xs rounded-xl shadow-xs hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Verifying & Uploading...' : 'Finalize & Confirm Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

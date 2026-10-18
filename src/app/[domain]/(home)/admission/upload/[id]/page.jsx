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
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5">
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-2">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 uppercase">
            Not Found
          </span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            Applicant Record Not Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The requested application ID does not correspond to any active intake record.
          </p>
          <div className="pt-2">
            <Link
              href="/admission"
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors inline-block"
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
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
        <div className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded p-6 space-y-4 text-center">
          <div>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 uppercase">
              Fee Clearance Required
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-2">
              Application Fee Clearance Required
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate photo and signature upload is unlocked strictly after application fee clearance.
              Current Status: <span className="font-mono font-medium text-rose-600 uppercase">{applicant.payment_status}</span>.
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 p-3.5 text-xs text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Candidate:</span>
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
          </div>

          <div className="pt-2">
            <Link
              href={`/pay/admission-fees/${applicant.id}`}
              className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors inline-block"
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
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase">
                  Application Verified
                </span>
                <span className="text-xs font-mono font-medium text-slate-500">
                  #{applicant.application_no}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Application &amp; Admit Card Slip
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              Print Admit Slip
            </button>
          </div>

          {/* Identification Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex flex-col items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Candidate"
                  className="w-24 h-24 object-cover rounded border border-slate-200"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-slate-400">Photo</div>
              )}
              <span className="text-[10px] text-slate-400 mt-1 font-mono">300 × 300 px</span>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Candidate Name</span>
                <div className="font-semibold text-slate-900 dark:text-white">{applicant.applicant_name}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Circular Applied</span>
                <div className="text-slate-700 dark:text-slate-300">{applicant.circular_title}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Roll No</span>
                  <div className="font-mono font-medium text-primary-dark">{applicant.roll_no || 'Assigned on Schedule'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Fee Status</span>
                  <div className="font-mono font-medium text-emerald-600 uppercase">Paid</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900">
              {signaturePreview ? (
                <img
                  src={signaturePreview}
                  alt="Signature"
                  className="w-28 h-10 object-contain"
                />
              ) : (
                <div className="w-28 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">Signature</div>
              )}
              <span className="text-[10px] text-slate-400 mt-1 font-mono">Candidate Signature</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary-dark border-primary/20 uppercase tracking-wider">
                Step 3 of 3: Media Upload
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                Tracking: {applicant.application_no}
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Candidate Photo &amp; Signature Verification
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <strong className="font-medium text-slate-800 dark:text-slate-200">{applicant.applicant_name}</strong> | Circular: {applicant.circular_title}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Photo Upload: 300x300 */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Candidate Photograph (Strictly 300 × 300 Pixels)
              </span>
              <span className="text-[10px] font-mono text-primary-dark">Square 1:1</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900">
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

              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary-dark hover:file:bg-primary/20 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Front-facing studio portrait. System validates exact 300px width and 300px height.
                </p>
              </div>
            </div>
          </div>

          {/* Signature Upload: 150x50 */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Candidate Signature (Strictly 150 × 50 Pixels)
              </span>
              <span className="text-[10px] font-mono text-primary-dark">Aspect 3:1</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-32 h-12 rounded border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 p-1">
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

              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleSignatureChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary-dark hover:file:bg-primary/20 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Sign on plain white paper and crop to exactly 150px width and 50px height.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/admission"
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white font-medium text-xs rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Verifying & Uploading...' : 'Finalize & Confirm Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { validateImageDimensions } from 'src/lib/imageResizer';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const CandidateUploadPage = () => {
  const params = useParams();
  const id = params?.id;
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [imagePreview, setImagePreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchApplicant = async () => {
      try {
        const res = await fetch(`${getApiEndpoint('public/admissions/upload')}?id=${id}`);
        const data = await res.json();
        if (res.ok && data.success && data.paylod?.applicant) {
          const app = data.paylod.applicant;
          setApplicant(app);
          if (app.image) setImagePreview(app.image);
          if (app.signature) setSignaturePreview(app.signature);
          if (app.image && app.signature) {
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
  }, [id, getApiEndpoint]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Str = await validateImageDimensions(file, 500, 500, 'Candidate Photo');
      setImagePreview(base64Str);
      toast.success('Candidate photo dimensions verified (500x500 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
    }
  };

  const handleSignatureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Str = await validateImageDimensions(file, 150, 30, 'Candidate Signature');
      setSignaturePreview(base64Str);
      toast.success('Candidate signature dimensions verified (150x30 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imagePreview) {
      toast.error('Please upload candidate profile photo (500x500 px).');
      return;
    }
    if (!signaturePreview) {
      toast.error('Please upload candidate signature (150x30 px).');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(getApiEndpoint('public/admissions/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(id, 10),
          image: imagePreview,
          signature: signaturePreview
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Photo and signature submitted successfully!');
        setSubmitted(true);
      } else {
        throw new Error(data.error || 'Failed to submit documents.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading applicant details...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center px-4 text-center space-y-3">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Application Record Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">The upload verification link may be expired.</p>
        <Link href={tenantUrl('/')} className="text-xs font-medium text-primary hover:underline">
          Return to Public Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        
        <div>
          <Link
            href={tenantUrl('/admission')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Admissions
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">
              Candidate Dossier Upload
            </span>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Upload Photo & Signature
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Required dimensions: Photo (500x500 px) and Signature (150x30 px).
            </p>
          </div>

          {/* Candidate badge */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Applicant</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.applicant_name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Class</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{applicant.class_name}</span>
            </div>
          </div>

          {submitted ? (
            <div className="p-4 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                Documents Verified & Received
              </span>
              <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                Your photograph and signature are on record and attached to your application.
              </p>

              <div className="flex justify-center gap-4 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                {imagePreview && (
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block mb-1">Photo (500x500)</span>
                    <div className="w-20 h-20 rounded border border-slate-300 dark:border-slate-700 overflow-hidden relative mx-auto">
                      <Image fill src={imagePreview} alt="Candidate" className="object-cover" sizes="80px" />
                    </div>
                  </div>
                )}
                {signaturePreview && (
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block mb-1">Signature (150x30)</span>
                    <div className="w-28 h-10 rounded border border-slate-300 dark:border-slate-700 bg-white overflow-hidden relative mx-auto">
                      <Image fill src={signaturePreview} alt="Signature" className="object-contain p-1" sizes="112px" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-800 dark:text-slate-200">
                    1. Profile Photo (500x500 px) *
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {imagePreview ? (
                      <Image fill src={imagePreview} alt="Photo" className="object-cover" sizes="80px" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Empty</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handlePhotoChange}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-medium file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-800 dark:text-slate-200">
                    2. Signature (150x30 px) *
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-10 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {signaturePreview ? (
                      <Image fill src={signaturePreview} alt="Signature" className="object-contain p-1" sizes="112px" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Empty</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleSignatureChange}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-medium file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Transmit Documents'}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

export default CandidateUploadPage;

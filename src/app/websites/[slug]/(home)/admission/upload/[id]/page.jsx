'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiUser, FiFileText } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { validateImageDimensions } from '@/lib/imageResizer';

const CandidateUploadPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

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
        const res = await fetch(`/api/public/admissions/upload?id=${id}`);
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
  }, [id]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Frontend validation: exactly 500x500 px
      const base64Str = await validateImageDimensions(file, 500, 500, 'Candidate Photo');
      setImagePreview(base64Str);
      toast.success('Candidate photo dimensions verified (500x500 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = ''; // Reset input
    }
  };

  const handleSignatureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Frontend validation: exactly 150x30 px
      const base64Str = await validateImageDimensions(file, 150, 30, 'Candidate Signature');
      setSignaturePreview(base64Str);
      toast.success('Candidate signature dimensions verified (150x30 px)!');
    } catch (err) {
      toast.error(err.message);
      e.target.value = ''; // Reset input
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
      const res = await fetch('/api/public/admissions/upload', {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <FiAlertCircle className="text-4xl text-amber-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Application Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">The link may be invalid or expired.</p>
        <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
          <FiArrowLeft /> Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors mb-6"
        >
          <FiArrowLeft /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          {/* Header */}
          <div className="text-center mb-8 border-b border-slate-100 pb-6">
            <span className="inline-block text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest mb-2">
              Applicant Portal
            </span>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Upload Photo &amp; Signature
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Provide candidate photo (500x500 px) and signature (150x30 px) to complete your admission review.
            </p>
          </div>

          {/* Applicant Info Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400 font-medium">Applicant Number</p>
              <p className="text-base font-semibold text-primary font-mono">APP-1000{applicant.id}</p>
              <p className="text-xs font-bold text-slate-800 mt-1">{applicant.applicant_name}</p>
            </div>
            <div className="text-right sm:text-right text-xs">
              <p className="text-slate-500 font-medium">Applied Class: <strong>{applicant.class_name}</strong></p>
              <p className="text-slate-500 font-medium mt-0.5">
                Payment Status:{' '}
                <span className={`font-bold uppercase px-2 py-0.5 rounded-full text-[10px] ${
                  applicant.fee_status?.toLowerCase() === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {applicant.fee_status || 'Pending'}
                </span>
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto text-2xl mb-3">
                <FiCheckCircle />
              </div>
              <h3 className="text-lg font-bold text-green-900">Documents Received!</h3>
              <p className="text-xs text-green-700 mt-1 max-w-md mx-auto leading-relaxed">
                Your profile photo and signature have been uploaded. Your admission profile is now submitted for administration review and result publication.
              </p>

              {/* Document Previews */}
              <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-green-200/60">
                {imagePreview && (
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Candidate Photo (500x500)</p>
                    <img src={imagePreview} alt="Candidate" className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-xs mx-auto" />
                  </div>
                )}
                {signaturePreview && (
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Candidate Signature (150x30)</p>
                    <img src={signaturePreview} alt="Signature" className="w-28 h-10 object-contain rounded-xl border border-slate-200 bg-white shadow-xs p-1 mx-auto" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Profile Photo Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Candidate Profile Photo <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-mono">
                    Required Size: 500 x 500 px
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FiUser className="text-4xl text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="candidate-photo-input"
                    />
                    <label
                      htmlFor="candidate-photo-input"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      <FiUploadCloud />
                      <span>{imagePreview ? 'Change Photo' : 'Select Photo (500x500)'}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-2">Image must be exactly 500x500 pixels (JPG or PNG).</p>
                  </div>
                </div>
              </div>

              {/* Signature Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Candidate Signature <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-mono">
                    Required Size: 150 x 30 px
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-48 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 p-1">
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature Preview" className="w-full h-full object-contain" />
                    ) : (
                      <FiFileText className="text-3xl text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleSignatureChange}
                      className="hidden"
                      id="candidate-signature-input"
                    />
                    <label
                      htmlFor="candidate-signature-input"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      <FiUploadCloud />
                      <span>{signaturePreview ? 'Change Signature' : 'Select Signature (150x30)'}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-2">Signature image must be exactly 150x30 pixels (JPG or PNG).</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-2 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading Documents...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    <span>Submit Photo &amp; Signature</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateUploadPage;

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiCalendar, 
  FiMapPin, FiAward, FiBook, FiCheck, FiX, FiLayers, FiImage, FiFileText
} from 'react-icons/fi';
import Link from 'next/link';

const ApplicantDetailsContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchApplicant = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/students/admissions?id=${id}`);
        const data = await res.json();
        if (data.success && data.paylod?.applicant) {
          setApplicant(data.paylod.applicant);
        } else {
          toast.error(data.error || 'Failed to load applicant details.');
        }
      } catch (err) {
        toast.error('Failed to load applicant details.');
      } finally {
        setLoading(false);
      }
    };
    fetchApplicant();
  }, [id]);

  const handleUpdateFeeStatus = async (newFeeStatus) => {
    try {
      const res = await fetch('/api/admin/students/admissions/fee-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_admission_id: id, status: newFeeStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Fee status updated successfully!');
        setApplicant(prev => ({ ...prev, fee_status: newFeeStatus }));
      } else {
        throw new Error(data.error || 'Failed to update fee status.');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleProcess = async (status) => {
    const confirm = window.confirm(`Are you sure you want to ${status.toLowerCase()} this application?`);
    if (!confirm) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/students/admissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Application ${status.toLowerCase()} successfully!`);
        router.push('/staff/registrar/admissions');
      } else {
        throw new Error(data.error || 'Failed to process application.');
      }
    } catch (err) {
      toast.error(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading applicant details...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <span className="text-5xl mb-4">🔍</span>
        <h3 className="text-lg font-bold text-slate-700">Applicant Not Found</h3>
        <p className="text-sm text-slate-450 mt-1">
          The requested admission candidate details could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up max-w-5xl">
      {/* Top breadcrumb */}
      <div>
        <Link
          href="/staff/registrar/admissions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-100 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <FiArrowLeft className="text-sm" />
          Back to Registry
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card - Photos & Quick Stats */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col items-center text-center gap-4">
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-50 border border-slate-150 relative">
              {applicant.image ? (
                <img src={applicant.image} alt={applicant.applicant_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-450">
                  <FiImage className="text-3xl" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{applicant.applicant_name}</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded uppercase tracking-wider mt-1">
                Class: {applicant.class_name}
              </span>
            </div>

            <div className="w-full border-t border-slate-50 pt-4 flex flex-col gap-3.5 text-left text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Fee Status</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  applicant.fee_status === 'Paid'
                    ? 'bg-green-50 text-green-600 border-green-100'
                    : applicant.fee_status === 'Cancelled' || applicant.fee_status === 'Cancel'
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {applicant.fee_status || 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Review Status</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  applicant.status === 'Approved'
                    ? 'bg-green-50 text-green-600 border-green-100'
                    : applicant.status === 'Rejected'
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {applicant.status}
                </span>
              </div>
            </div>

            {applicant.status === 'Pending' && (
              <div className="w-full flex gap-2 pt-2 border-t border-slate-50">
                <button
                  disabled={processing}
                  onClick={() => handleProcess('Approved')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <FiCheck /> Approve
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleProcess('Rejected')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <FiX /> Reject
                </button>
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <FiFileText /> Applicant Signature
            </h3>
            <div className="w-full h-24 border border-dashed border-slate-200 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
              {applicant.signature ? (
                <img src={applicant.signature} alt="Signature" className="h-full object-contain p-2" />
              ) : (
                <span className="text-xs text-slate-400 font-bold">No Signature Image</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Details Panels */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2.5">Personal details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="flex items-start gap-2.5">
                <FiUser className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Candidate Full Name</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.applicant_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FiCalendar className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-slate-800 text-sm mt-0.5">
                    {new Date(applicant.date_of_birth).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FiUser className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gender</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.gender}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FiAward className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Birth Registration Number</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.birth_regi_number || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2.5">Contact Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="flex items-start gap-2.5">
                <FiPhone className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Contact Phone</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FiMail className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Contact Email</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 md:col-span-2">
                <FiMapPin className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Residential Address</p>
                  <p className="text-slate-800 text-sm mt-0.5 leading-relaxed">{applicant.address}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2.5">Guardian & Previous Academic History</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="flex items-start gap-2.5">
                <FiUser className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Guardian Name</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.guardian_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FiPhone className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Guardian Phone Number</p>
                  <p className="text-slate-800 text-sm mt-0.5">{applicant.guardian_phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 md:col-span-2">
                <FiBook className="text-slate-400 text-base mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Previous School History</p>
                  <p className="text-slate-800 text-sm mt-0.5 leading-relaxed">{applicant.previous_school || 'None'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplicantDetailsPage = () => {
  return (
    <Suspense fallback={
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Initializing...</span>
      </div>
    }>
      <ApplicantDetailsContent />
    </Suspense>
  );
};

export default ApplicantDetailsPage;

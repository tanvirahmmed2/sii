'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiCalendar, 
  FiMapPin, FiAward, FiBook, FiCheck, FiX, FiLayers, FiImage, FiFileText, FiDollarSign, FiHeart
} from 'react-icons/fi';
import Image from 'next/image';

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
    const confirm = window.confirm(`Are you sure you want to change status to "${status}"?`);
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
        toast.success(data.message || `Application status updated to ${status}!`);
        setApplicant(prev => ({ ...prev, status }));
      } else {
        throw new Error(data.error || 'Failed to process application.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading applicant details...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <span className="text-4xl mb-3">🔍</span>
        <h3 className="text-sm font-bold text-slate-700">Applicant Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">
          The requested admission candidate details could not be loaded.
        </p>
        <button
          onClick={() => router.push('/admin/students/admissions')}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isSelected = ['selected', 'approved'].includes((applicant.status || '').toLowerCase());
  const isDisqualified = ['disqualified', 'rejected'].includes((applicant.status || '').toLowerCase());

  return (
    <div className="w-full  flex flex-col gap-5">
      <button
        onClick={() => router.push('/admin/students/admissions')}
        className="self-start flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
      >
        <FiArrowLeft className="text-sm" /> Back to Application Registry
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Left Column: Visual Assets */}
        <div className="md:col-span-1 flex flex-col gap-5">
          {/* Candidate Image Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center text-center gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-start flex items-center gap-1.5">
              <FiImage className="text-xs text-primary" /> Photo (500 x 500 px)
            </p>
            {applicant.image ? (
              <Image width={500} height={500}
                src={applicant.image} 
                alt="Candidate Profile" 
                className="w-40 h-40 rounded-xl object-cover border border-slate-200 shadow-2xs bg-slate-50"
              />
            ) : (
              <div className="w-40 h-40 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
                No Photo Provided
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-800">{applicant.applicant_name}</h2>
              <span className="inline-flex mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-primary border border-emerald-200/60">
                Class: {applicant.class_name}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center text-center gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-start flex items-center gap-1.5">
              <FiFileText className="text-xs text-primary" /> Signature (150 x 30 px)
            </p>
            {applicant.signature ? (
              <Image width={300} height={300} 
                src={applicant.signature} 
                alt="Candidate Signature" 
                className="w-full max-w-50 h-12 rounded-lg object-contain border border-slate-200 bg-white p-1"
              />
            ) : (
              <div className="w-full h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-semibold">
                No Signature Provided
              </div>
            )}
          </div>

          {/* Admission Fee Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FiDollarSign className="text-xs text-primary" /> Admission Fee Status
            </p>
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Fee Amount:</span>
                <span className="font-bold text-slate-800">BDT {parseFloat(applicant.fee_amount || applicant.admission_fees_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Status:</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  applicant.fee_status === 'Paid' || applicant.fee_status === 'paid'
                    ? 'bg-emerald-50 text-primary border-emerald-200/60'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {applicant.fee_status || 'Pending'}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Update Fee Status</label>
                <select
                  value={applicant.fee_status || 'Pending'}
                  onChange={(e) => handleUpdateFeeStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Candidate & Parents Information */}
        <div className="md:col-span-2 flex flex-col gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col gap-5">
            
            {/* Header info */}
            <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  isSelected 
                    ? 'bg-emerald-50 text-primary border-emerald-200/60' 
                    : isDisqualified
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isSelected ? 'Selected' : isDisqualified ? 'Disqualified' : 'Pending Review'}
                </span>
                {applicant.admission_title && (
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Circular: {applicant.admission_title}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">
                Applied Date: {new Date(applicant.applied_date).toLocaleDateString()}
              </p>
            </div>

            {/* Profile Fields */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">1. Candidate Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiUser /> Candidate Name
                  </p>
                  <p className="font-bold text-slate-800">{applicant.applicant_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiCalendar /> Date of Birth &amp; Gender
                  </p>
                  <p className="font-bold text-slate-800">
                    {new Date(applicant.date_of_birth).toLocaleDateString()} ({applicant.gender})
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiAward /> Birth Certificate No.
                  </p>
                  <p className="font-bold text-slate-800">{applicant.birth_regi_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiHeart /> Blood Group
                  </p>
                  <p className="font-bold text-slate-800">{applicant.blood_group || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact & Address */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">2. Contact &amp; Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiPhone /> Contact Phone
                  </p>
                  <p className="font-bold text-slate-800">{applicant.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiMail /> Candidate Email
                  </p>
                  <p className="font-bold text-slate-800">{applicant.email}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <FiMapPin /> Address
                  </p>
                  <p className="font-semibold text-slate-800 leading-relaxed">{applicant.address}</p>
                </div>
              </div>
            </div>

            {/* Father & Mother Details */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">3. Parents Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Father Details</p>
                  <p className="font-bold text-slate-800">{applicant.father_name || applicant.guardian_name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{applicant.father_phone || applicant.guardian_phone}</p>
                  {applicant.father_occupation && <p className="text-[10px] text-slate-400 font-medium">Occupation: {applicant.father_occupation}</p>}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mother Details</p>
                  <p className="font-bold text-slate-800">{applicant.mother_name || 'N/A'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{applicant.mother_phone || 'N/A'}</p>
                  {applicant.mother_occupation && <p className="text-[10px] text-slate-400 font-medium">Occupation: {applicant.mother_occupation}</p>}
                </div>
              </div>
            </div>

            {/* Past School & Special Notes */}
            {(applicant.past_school_name || applicant.special_note) && (
              <div className="border-t border-slate-100 pt-4 text-xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">4. Past School &amp; Special Note</h3>
                <div className="flex flex-col gap-2">
                  {applicant.past_school_name && (
                    <p className="font-semibold text-slate-700">
                      Past School: <strong>{applicant.past_school_name}</strong> (Class: {applicant.past_school_class || 'N/A'}, Result: {applicant.past_school_result || 'N/A'})
                    </p>
                  )}
                  {applicant.special_note && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-900">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Special Note / Remarks</p>
                      <p className="text-xs font-medium leading-relaxed">{applicant.special_note}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Change Controls (Admin / Registrar Overrides at any time) */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-auto">Admin Selection Control:</span>
              
              <button
                disabled={processing}
                onClick={() => handleProcess('pending')}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Mark Pending
              </button>

              <button
                disabled={processing}
                onClick={() => handleProcess('disqualified')}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <FiX className="text-xs" /> Disqualify / Reject
              </button>

              <button
                disabled={processing}
                onClick={() => handleProcess('selected')}
                className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <FiCheck className="text-xs" /> Select / Approve Candidate
              </button>
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
        <span className="text-xs font-semibold text-slate-400">Preparing candidate profile...</span>
      </div>
    }>
      <ApplicantDetailsContent />
    </Suspense>
  );
};

export default ApplicantDetailsPage;

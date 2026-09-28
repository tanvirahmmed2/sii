'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiAward,
  FiUser,
  FiShield,
  FiBriefcase,
  FiAlertCircle
} from 'react-icons/fi';
import Image from 'next/image';

const AuthorityViewContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [authority, setAuthority] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('No authority ID specified.');
      return;
    }

    const fetchAuthorityDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/authorities/${id}`);
        if (res.ok) {
          const data = await res.json();
          const payload = data.paylod || data.payload || {};
          setAuthority(payload.authority || null);
        } else {
          setError('Authority member not found.');
        }
      } catch (err) {
        console.error('Error fetching authority details:', err);
        setError('Failed to load authority details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorityDetails();
  }, [id]);

  return (
    <div className="w-full min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <Link
            href="/authorities"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-primary transition-colors bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-2xs"
          >
            <FiArrowLeft className="text-sm" /> Back to Authorities Directory
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-2xs space-y-6 animate-pulse">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-28 h-28 bg-slate-200 rounded-2xl shrink-0" />
              <div className="space-y-3 w-full max-w-md">
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
            <div className="h-24 bg-slate-100 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-2xs">
            <FiAlertCircle className="text-amber-500 text-4xl mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Profile Not Found</h3>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
            <Link
              href="/authorities"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              <FiArrowLeft /> Return to Authorities
            </Link>
          </div>
        ) : authority ? (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 shadow-xs relative">
                  {authority.image ? (
                    <Image width={400} height={400}
                      src={authority.image}
                      alt={authority.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary bg-primary-light">
                      <FiUser className="text-4xl" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        {authority.name}
                      </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-primary font-bold flex items-center justify-center sm:justify-start gap-1.5">
                      <FiBriefcase className="text-primary text-xs" />
                      {authority.designation_title || 'Authority Leader'}
                    </p>
                  </div>

                  {/* Quick Contact Pills */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-medium pt-1">
                    {authority.email && (
                      <a
                        href={`mailto:${authority.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-white hover:border-primary transition-all text-slate-700 font-medium"
                      >
                        <FiMail className="text-primary text-xs" /> {authority.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {authority.bio && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FiShield className="text-primary text-base" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Biography & Executive Statement
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {authority.bio}
                </p>
              </div>
            )}

            {/* Qualifications Section */}
            {authority.qualifications && authority.qualifications.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FiAward className="text-primary text-base" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Academic Qualifications & Background
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {authority.qualifications.map((q) => (
                    <div
                      key={q.id}
                      className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-1"
                    >
                      <h4 className="font-bold text-slate-800 text-sm">{q.degree}</h4>
                      <p className="text-xs text-slate-600 font-medium">{q.institution}</p>
                      {q.passing_year && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Year: {q.passing_year}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
};

export default function AuthorityViewPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen py-20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AuthorityViewContent />
    </Suspense>
  );
}

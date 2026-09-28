'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Life from '@/component/pages/home/Life';
import { AdmissionCircularCard } from '@/component/cards';

const AdmissionPage = () => {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCirculars = async () => {
      try {
        const res = await fetch('/api/admin/admissions');
        const data = await res.json();
        if (data.success && data.paylod?.circulars) {
          const todayStr = new Date().toISOString().split('T')[0];
          const active = data.paylod.circulars.filter(
            (c) => new Date(c.finish_date).toISOString().split('T')[0] >= todayStr
          );
          setCirculars(active);
        }
      } catch (err) {
        console.error('Failed to load active circulars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCirculars();
  }, []);



  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="text-center mb-12">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Admission & Enrollment circulars
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Explore active entry circular drives, registration requirements, and file your student admission application.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Active Circulars
          </h2>

          {loading ? (
            <div className="w-full py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : circulars.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xs">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-bold text-slate-500 mt-2">No Active Circulars Right Now</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Please check back later or contact the admin desk.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {circulars.map((c) => (
                <AdmissionCircularCard key={c.id} circular={c} />
              ))}
            </div>
          )}
        </div>

        <Life/>
      </div>
    </div>
  );
};

export default AdmissionPage;

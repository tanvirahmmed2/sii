'use client';

import React, { useEffect, useState } from 'react';
import { FiHome, FiInfo } from 'react-icons/fi';
import Link from 'next/link';
import { SCHOOL_NAME } from '@/lib/secret';
import { HostelsCard } from '@/component/cards';

const HostelFacilities = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const res = await fetch('/api/hostels');
        if (res.ok) {
          const data = await res.json();
          setHostels(data.payload?.hostels || data.paylod?.hostels || []);
        }
      } catch (err) {
        console.error('Error fetching hostels:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHostels();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center mb-12">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Residential Housing Directory
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Secure housing accommodations for active {SCHOOL_NAME.split(" ").map((e)=>e[0]).join('')} students. Rooms are allocated matching student profile genders.
          </p>
        </div>

        {loading ? (
          <div className="w-full py-12 flex justify-center bg-white rounded-3xl border border-slate-100 shadow-xs">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hostels.length === 0 ? (
          <div className="w-full py-12 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center p-6 shadow-xs">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-sm mb-3">
              <FiInfo />
            </div>
            <p className="text-slate-400 text-xs font-medium">No hostel records registered in the directory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hostels.map((hostel) => (
              <HostelsCard key={hostel.id} hostel={hostel} />
            ))}
          </div>
        )}

        {/* Validation rule warning box */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 md:p-8 mt-8 shadow-xs flex gap-4 text-xs sm:text-sm text-amber-800 leading-relaxed items-start">
          <FiInfo className="text-amber-550 text-lg shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-amber-900">Important Allocation Policies</h4>
            <p className="text-xs">
              Room allocation matching rules are strictly hardcoded. Male students are allowed room allocations exclusively inside Male Designated Hostels, and Female students exclusively inside Female Designated Hostels. Attempted cross-gender allocations will be rejected by the portal registration API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostelFacilities;
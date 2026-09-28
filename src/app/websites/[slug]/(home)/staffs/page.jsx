'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import StaffCard from '@/component/cards/StaffCard';
import { FiUsers, FiBriefcase } from 'react-icons/fi';

export default function PublicStaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/staff');
      const data = res.data.paylod;
      setStaffList(data?.staff || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="text-center">
         
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Institutional Staff Directory
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base font-medium">
            Meet our back-office administrative staff, registrar officers, and support desk teams.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs animate-pulse flex gap-4 h-36">
                <div className="w-20 h-20 rounded-full bg-slate-100 shrink-0 my-auto"></div>
                <div className="flex-1 flex flex-col justify-center gap-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : staffList.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {staffList.map((staff) => (
              <StaffCard key={staff.id} staff={staff} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs">
            <FiUsers className="text-4xl text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Staff Registered</h3>
            <p className="text-slate-400 text-xs mt-1">
              No institutional staff profiles are currently listed in the directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

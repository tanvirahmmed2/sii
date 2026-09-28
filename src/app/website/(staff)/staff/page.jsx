'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiDollarSign, FiUsers, FiSliders, FiClock, FiActivity } from 'react-icons/fi';

const StaffDashboard = () => {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/staff/me');
        if (res.ok) {
          const data = await res.json();
          setStaff(data.paylod.staff);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading portal dashboard...</span>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="w-full text-center py-16">
        <h3 className="text-red-650 font-bold">Unauthorized access</h3>
        <p className="text-xs text-slate-400 mt-1">Please log in to access the staff portal.</p>
      </div>
    );
  }

  const role = staff.role;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Welcome Banner */}
      <div className="p-6 bg-linear-to-r bg-primary text-secondary rounded-3xl text-white shadow-md shadow-sky-500/10 relative overflow-hidden">
        <div className="absolute right-[-10%] top-[-20%] w-[40%] aspect-square rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        
        <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
          Staff Portal
        </span>
        <h1 className="text-2xl font-bold mt-3">Welcome Back, {staff.name}!</h1>
        <p className="text-xs text-white/80 mt-1">
          Logged in as <span className="font-semibold capitalize">{role}</span> &bull; {staff.designation || 'Operational Staff'}
        </p>
      </div>

      {/* Main Grid depending on Role */}
      {role === 'cashier' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-700">Financial Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                <FiDollarSign className="text-amber-600 text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Billing Desk</h3>
                <p className="text-xs text-slate-400 mt-1">Record payments, manage student tuition invoices, and view receipts.</p>
              </div>
              <Link
                href="/staff/cashier/transactions"
                className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                Open billing desk &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {role === 'registrar' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-700">Registry Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-2xl flex items-center justify-center border border-primary-light">
                <FiUsers className="text-primary text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Admissions Desk</h3>
                <p className="text-xs text-slate-400 mt-1">Review admission drives, process circulars, and approve candidates.</p>
              </div>
              <Link
                href="/staff/registrar/admissions"
                className="mt-2 text-xs font-bold text-primary hover:text-primary flex items-center gap-1"
              >
                Open admissions &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {role === 'staff' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-700">Staff Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">
                <FiActivity className="text-slate-655 text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Support Operations</h3>
                <p className="text-xs text-slate-400 mt-1">View assigned daily rosters, submit maintenance reports, or register logs.</p>
              </div>
              <span className="mt-2 text-xs font-bold text-slate-400 italic">No assigned tasks</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;

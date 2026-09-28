'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiClock, FiCheck, FiSearch, FiSliders, FiCreditCard, FiAlertOctagon } from 'react-icons/fi';

const CashierPayrollPage = () => {
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('teacher'); // 'teacher' or 'staff'
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSalaries = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salaries?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setSalaries(data.paylod?.salaries || []);
      }
    } catch (err) {
      toast.error(`Failed to load ${type} payroll history.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkRole = async () => {
      try {
        const profileRes = await fetch('/api/staff/me');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setRole(profileData.paylod.staff.role);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    if (role === 'cashier') {
      fetchSalaries(activeTab);
    }
  }, [activeTab, role]);

  const handlePaySalary = async (salaryId) => {
    setUpdatingId(salaryId);
    try {
      const res = await fetch('/api/salaries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary_id: salaryId,
          type: activeTab,
          status: 'Paid'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update salary status');
      toast.success(data.message || 'Salary status updated to Paid!');
      
      // Update state locally
      setSalaries(prev =>
        prev.map(s => s.id === salaryId ? { ...s, status: 'Paid' } : s)
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !role) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading payroll history...</span>
      </div>
    );
  }

  if (role !== 'cashier') {
    return (
      <div className="w-full max-w-md mx-auto mt-16 p-8 bg-red-50 border border-red-100 rounded-3xl text-center flex flex-col items-center gap-4 shadow-sm animate-fade-up">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FiAlertOctagon className="text-red-600 text-xl" />
        </div>
        <div>
          <h2 className="text-base font-bold text-red-800">Access Denied</h2>
          <p className="text-xs text-red-655 text-red-600 mt-1">
            This payroll module is restricted to the <strong>Cashier</strong> role only.
          </p>
        </div>
      </div>
    );
  }

  // Filter salaries by search query
  const filteredSalaries = salaries.filter(s => {
    const name = activeTab === 'staff' ? s.staff_name : s.teacher_name;
    const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.month.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiDollarSign className="text-indigo-650 text-primary animate-bounce" /> Payroll Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review employee salary pay slips, verify month basic salaries, and record bank/cash transfers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-2">
        <button
          onClick={() => setActiveTab('teacher')}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'teacher'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Teacher Payroll
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Support Staff Payroll
        </button>
      </div>

      {/* Filters */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
        <div className="relative">
          <FiSearch className="absolute left-4 top-3.5 text-slate-400 text-base" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary"
          />
        </div>
      </div>

      {/* Salaries Log Registry Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {filteredSalaries.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">💵</span>
            <h3 className="text-sm font-bold text-slate-655">No Salaries Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              No salary ledgers have been generated or matching search.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Basic Salary</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Allowance</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Deductions</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Net Pay</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalaries.map((s) => {
                  const isPaid = s.status === 'Paid';
                  const name = activeTab === 'staff' ? s.staff_name : s.teacher_name;
                  const netPaid = parseFloat(s.basic) + parseFloat(s.allowance) - parseFloat(s.deductions);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{name || 'Unassigned'}</span>
                          {activeTab === 'staff' && s.staff_role && (
                            <span className="text-[10px] text-slate-400 font-semibold capitalize">Role: {s.staff_role}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">{s.month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold text-right">৳{parseFloat(s.basic).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold text-right">+৳{parseFloat(s.allowance).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold text-right">-৳{parseFloat(s.deductions).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 text-right">৳{netPaid.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isPaid ? 'bg-primary-light text-primary' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {isPaid ? <FiCheck /> : <FiClock />}
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {!isPaid ? (
                          <button
                            onClick={() => handlePaySalary(s.id)}
                            disabled={updatingId === s.id}
                            className="text-xs font-bold text-indigo-650 text-indigo-650 text-primary hover:text-primary bg-primary-light hover:bg-primary-light px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <FiCreditCard className="text-xs" /> Pay salary
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-semibold px-2">Cleared</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierPayrollPage;

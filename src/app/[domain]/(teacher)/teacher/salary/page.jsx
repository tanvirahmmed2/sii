'use client';

import React, { useEffect, useState } from 'react';
import { FiDollarSign, FiCheck, FiClock } from 'react-icons/fi';

const SalaryHistoryPage = () => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const res = await fetch('/api/teacher/salary');
        if (res.ok) {
          const data = await res.json();
          setSalaries(data.paylod.salaries || []);
        }
      } catch (err) {
        console.error('Failed to load salary ledger:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, []);

  const paidSalaries = salaries.filter((s) => s.status === 'Paid');
  const totalEarned = paidSalaries.reduce((sum, s) => sum + parseFloat(s.basic) + parseFloat(s.allowance) - parseFloat(s.deductions), 0);
  const totalPending = salaries.filter((s) => s.status !== 'Paid').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FiDollarSign className="text-primary" /> Salary Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Monthly basic pay, allowances, deductions, and payment status.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Total Earned</span>
          <span className="text-xl font-bold text-emerald-600">৳{totalEarned.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Pending Credits</span>
          <span className={`text-xl font-bold ${totalPending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{totalPending}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">Loading salary records...</div>
        ) : salaries.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No salary entries registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-2.5">Billing Month</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Basic Pay</th>
                  <th className="px-4 py-2.5 text-right">Allowances</th>
                  <th className="px-4 py-2.5 text-right">Deductions</th>
                  <th className="px-4 py-2.5 text-right">Net Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaries.map((salary) => {
                  const net = parseFloat(salary.basic) + parseFloat(salary.allowance) - parseFloat(salary.deductions);
                  return (
                    <tr key={salary.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{salary.month}</td>
                      <td className="px-4 py-2.5">
                        {salary.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><FiCheck className="text-[9px]" /> Paid</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100"><FiClock className="text-[9px]" /> Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 font-mono text-[11px]">৳{parseFloat(salary.basic).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-mono text-[11px]">+৳{parseFloat(salary.allowance).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-rose-600 font-mono text-[11px]">-৳{parseFloat(salary.deductions).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800 font-mono text-[11px]">৳{net.toFixed(2)}</td>
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

export default SalaryHistoryPage;

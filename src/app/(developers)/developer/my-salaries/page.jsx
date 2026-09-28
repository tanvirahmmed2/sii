'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BiCreditCard,
  BiDollar,
  BiTime,
  BiCheckCircle,
  BiRefresh,
  BiCalendar,
  BiReceipt,
  BiTrendingUp,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function MySalariesPage() {
  const { user } = useContext(Context);

  const [salaries, setSalaries] = useState([]);
  const [stats, setStats] = useState({
    total_paid: 0,
    pending_payout: 0,
    total_earned: 0,
    total_cycles: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/my-salaries');
      const data = await res.json();
      if (data.success) {
        setSalaries(data.salaries || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Error fetching personal salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-widest mb-1">
            <BiReceipt className="text-base" /> Personal Compensation
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Salary & Payment History
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Review your salary allocations, bonus rewards, deductions, and disbursement records.
          </p>
        </div>
        <button
          onClick={fetchSalaries}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <BiRefresh className="text-xl" />
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Received</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              <BiCheckCircle />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${Number(stats.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 font-medium">Successfully disbursed to you</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payout</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              <BiTime />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${Number(stats.pending_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-amber-600 font-medium">Awaiting payment cycle</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lifetime Earnings</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              <BiTrendingUp />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${Number(stats.total_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-indigo-600 font-medium">Gross allocated net total</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cycles Completed</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              <BiCreditCard />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total_cycles || 0}</div>
          <div className="text-xs text-purple-600 font-medium">Payroll periods recorded</div>
        </div>
      </div>

      {/* Salary History Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Disbursement History</h2>
          <span className="text-xs text-slate-400 font-semibold">{salaries.length} records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading salary history...</div>
        ) : salaries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              <BiReceipt />
            </div>
            <p className="text-slate-500 text-sm font-medium">No salary disbursements recorded yet.</p>
            <p className="text-xs text-slate-400">
              When administration runs payroll, your salary allocations and payment slips will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Payroll Cycle & Period</th>
                  <th className="px-6 py-4">Base Salary</th>
                  <th className="px-6 py-4">Bonus</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Payout</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Payment Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaries.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{s.payroll_title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <BiCalendar /> {new Date(s.pay_period_start).toLocaleDateString()} –{' '}
                        {new Date(s.pay_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">${Number(s.base_salary).toFixed(2)}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">
                      {Number(s.bonus) > 0 ? `+$${Number(s.bonus).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-rose-600 font-medium">
                      {Number(s.deductions) > 0 ? `-$${Number(s.deductions).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      ${Number(s.net_salary).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          s.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {s.payment_status === 'PAID' ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <BiCheckCircle className="text-emerald-500" /> {s.disbursement_method || s.payment_method}
                          </div>
                          {s.transaction_reference && (
                            <div className="text-slate-400 font-mono text-[11px]">
                              Ref: {s.transaction_reference}
                            </div>
                          )}
                          {s.payment_date && (
                            <div className="text-slate-400 text-[11px]">
                              Date: {new Date(s.payment_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Scheduled via {s.payment_method}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

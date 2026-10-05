'use client';

import { useState, useEffect, useContext } from 'react';
import { Context } from 'src/component/helper/Context';

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
      const res = await fetch('/api/marketing/developer/my-salaries');
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
            My Salary &amp; Payment History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review your salary allocations, bonus rewards, deductions, and disbursement records.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSalaries}
          className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer self-start sm:self-auto"
        >
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Total Received</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">
            ${Number(stats.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Successfully disbursed to you</div>
        </div>

        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Pending Payout</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">
            ${Number(stats.pending_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Awaiting payment cycle</div>
        </div>

        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Lifetime Earnings</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">
            ${Number(stats.total_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Gross allocated net total</div>
        </div>

        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Cycles Completed</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">{stats.total_cycles || 0}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Payroll periods recorded</div>
        </div>
      </div>

      {/* Salary History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white">Disbursement History</h2>
          <span className="text-xs text-slate-400 font-normal">{salaries.length} records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading salary history...</div>
        ) : salaries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-slate-500 text-xs font-medium">No salary disbursements recorded yet.</p>
            <p className="text-[11px] text-slate-400">
              When administration runs payroll, your salary allocations and payment slips will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Payroll Cycle &amp; Period</th>
                  <th className="px-4 py-3">Base Salary</th>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Payout</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salaries.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{s.payroll_title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {new Date(s.pay_period_start).toLocaleDateString()} – {new Date(s.pay_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">${Number(s.base_salary).toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      {Number(s.bonus) > 0 ? `+$${Number(s.bonus).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                      {Number(s.deductions) > 0 ? `-$${Number(s.deductions).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      ${Number(s.net_salary).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                          s.payment_status === 'PAID'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.payment_status === 'PAID' ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {s.disbursement_method || s.payment_method}
                          </div>
                          {s.transaction_reference && (
                            <div className="text-slate-400 font-mono text-[10px]">
                              Ref: {s.transaction_reference}
                            </div>
                          )}
                          {s.payment_date && (
                            <div className="text-slate-400 text-[10px]">
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

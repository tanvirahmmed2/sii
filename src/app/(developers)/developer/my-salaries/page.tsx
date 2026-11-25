'use client';
import { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { BiSearch, BiX } from 'react-icons/bi';

export default function MySalariesPage() {
    const { user } = useContext<any>(Context);
    const [salaries, setSalaries] = useState<any>([]);
    const [stats, setStats] = useState<any>({
        total_paid: 0,
        pending_payout: 0,
        total_earned: 0,
        total_cycles: 0,
    });
    const [loading, setLoading] = useState<any>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/marketing/developer/my-salaries');
            const data = await res.json();
            if (data.success) {
                setSalaries(data.salaries || []);
                setStats(data.stats || {});
            }
        }
        catch (err: any) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, []);

    const filteredSalaries = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        return salaries.filter((s: any) => {
            if (statusFilter !== 'ALL' && s.payment_status !== statusFilter) return false;
            if (!q) return true;

            const titleMatch = String(s.payroll_title || '').toLowerCase().includes(q);
            const statusMatch = String(s.payment_status || '').toLowerCase().includes(q);
            const methodMatch = String(s.disbursement_method || s.payment_method || '').toLowerCase().includes(q);
            const refMatch = String(s.transaction_reference || '').toLowerCase().includes(q);

            return titleMatch || statusMatch || methodMatch || refMatch;
        });
    }, [salaries, searchTerm, statusFilter]);

    return (
        <div className="w-full space-y-4">
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

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
                <Link href="/developer/payroll" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
                    Payroll Runs
                </Link>
                <Link href="/developer/payroll/assign" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
                    Assign to Developer
                </Link>
                <Link href="/developer/payroll/payments" className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">
                    Payroll Payments
                </Link>
                <Link href="/developer/my-salaries" className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    My Salaries
                </Link>
            </div>

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

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="w-full md:w-80">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Search Salary Records
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                            />
                            <BiSearch className="absolute left-3 top-2.5 text-slate-400 text-sm pointer-events-none" />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <BiX className="text-base" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50 text-xs">
                            {['ALL', 'PAID', 'UNPAID'].map((st: string) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1 rounded font-medium cursor-pointer transition ${
                                        statusFilter === st
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                        <span className="text-xs text-slate-400 font-normal">
                            Showing {filteredSalaries.length} of {salaries.length} records
                        </span>
                    </div>
                </div>

                {loading ? (
                    <LoadingScreen fullScreen={false} size="sm" label="Loading salary history..." />
                ) : filteredSalaries.length === 0 ? (
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
                                {filteredSalaries.map((s: any) => (
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
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                                                s.payment_status === 'PAID'
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                            }`}>
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

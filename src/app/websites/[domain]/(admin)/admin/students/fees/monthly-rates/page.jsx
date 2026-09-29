'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiDollarSign, FiEdit2, FiTrash2, FiPlus, FiX, FiLayers } from 'react-icons/fi';
import Link from 'next/link';

const MonthlyRatesPage = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [selectedClass, setSelectedClass] = useState(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMonthlyFees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/monthly-fees');
      const data = await res.json();
      if (res.ok && data.success) {
        setFees(data.paylod?.monthlyFees || []);
      } else {
        throw new Error(data.error || 'Failed to retrieve monthly fees.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyFees();
  }, []);

  const handleOpenEdit = (item) => {
    setSelectedClass(item);
    setAmount(item.amount || '0.00');
  };

  const handleCloseEdit = () => {
    setSelectedClass(null);
    setAmount('');
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/finance/monthly-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass.class_id,
          amount: parseFloat(amount)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save rate.');

      toast.success(data.message || 'Fee rate saved successfully.');
      handleCloseEdit();
      fetchMonthlyFees();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRate = async (monthlyFeeId, className) => {
    if (!monthlyFeeId) return;
    const confirm = window.confirm(`Are you sure you want to reset the monthly fee rate for "${className}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/finance/monthly-fees/${monthlyFeeId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset rate.');

      toast.success(data.message || 'Fee rate reset successfully.');
      fetchMonthlyFees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up max-w-4xl">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/students/fees"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-100 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <FiArrowLeft className="text-sm" />
          Back to Billing
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <FiDollarSign className="text-primary" /> Class Tuition Fee Rates
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure the base monthly tuition fee amount assigned to students of each academic class level.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Classes Table List */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-400">Loading classes rates...</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-655">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Class Name</th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Monthly rate</th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                  {fees.map((item) => (
                    <tr key={item.class_id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                          <FiLayers className="text-blue-400 text-xs" />
                          {item.class_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.monthly_fee_id ? (
                          <span className="text-sm font-semibold text-slate-900">
                            ৳{parseFloat(item.amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 italic">
                            Not Configured (৳0.00)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right pr-8">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer transition-colors"
                            title="Set/Edit Tuition Rate"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          {item.monthly_fee_id && (
                            <button
                              onClick={() => handleResetRate(item.monthly_fee_id, item.class_name)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg cursor-pointer transition-colors"
                              title="Reset tuition fee rate"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Panel Card */}
        <div className="md:col-span-1">
          {selectedClass ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col gap-4 animate-fade-up">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  ⚙️ Configure Tuition Rate
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Set base monthly rate for class: <strong>{selectedClass.class_name}</strong>.
                </p>
              </div>

              <form onSubmit={handleSaveRate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rate Amount (BDT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : 'Save Rate'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2 h-48">
              <span className="text-2xl">💰</span>
              <p className="text-xs font-semibold">Select a class from the list to set or modify its tuition fee rate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyRatesPage;

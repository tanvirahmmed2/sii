'use client';
import { useState } from 'react';
import { generateToken } from 'src/lib/utils/random';
export default function PaymentForm({ onSuccess, onCancel }: any) {
    const [formData, setFormData] = useState<any>({
        creator_id: '1',
        package_id: '1',
        billing_cycle: 'monthly',
        amount: '2900',
        currency: 'BDT',
        payment_method: 'manual_cash',
        transaction_id: '',
        manual_payment_notes: '',
        status: 'COMPLETED',
    });
    const [loading, setLoading] = useState<any>(false);
    const [error, setError] = useState<any>('');
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const transaction_id = formData.transaction_id || `MAN-${generateToken(10).toUpperCase()}`;
        try {
            const res = await fetch('/api/marketing/developer/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'manual_payment',
                    data: {
                        creator_id: Number(formData.creator_id),
                        package_id: Number(formData.package_id),
                        billing_cycle: formData.billing_cycle,
                        amount: Number(formData.amount),
                        currency: formData.currency,
                        payment_method: formData.payment_method,
                        transaction_id,
                        manual_payment_notes: formData.manual_payment_notes || 'Manual developer billing settlement',
                        status: formData.status,
                        is_manual: true,
                    },
                }),
            });
            const data = await res.json();
            if (data.success) {
                setFormData({
                    creator_id: '1',
                    package_id: '1',
                    billing_cycle: 'monthly',
                    amount: '2900',
                    currency: 'BDT',
                    payment_method: 'manual_cash',
                    transaction_id: '',
                    manual_payment_notes: '',
                    status: 'COMPLETED',
                });
                if (onSuccess)
                    onSuccess(data.record);
            }
            else {
                setError(data.error || 'Failed to record manual payment');
            }
        }
        catch (err: any) {
            setError(err.message || 'Network error recording payment');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Manual Platform Payment</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Collect manual cash, bank transfer, or direct MFS settlement and activate creator subscription.
          </p>
        </div>
        {onCancel && (<button type="button" onClick={onCancel} className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
            Close
          </button>)}
      </div>

      {error && (<div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
          {error}
        </div>)}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Creator Account ID</label>
            <input type="number" required value={formData.creator_id} onChange={(e: any) => setFormData({ ...formData, creator_id: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"/>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Package Plan ID</label>
            <input type="number" required value={formData.package_id} onChange={(e: any) => setFormData({ ...formData, package_id: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"/>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Interval</label>
            <select value={formData.billing_cycle} onChange={(e: any) => setFormData({ ...formData, billing_cycle: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600">
              <option value="monthly">Monthly Plan (30 Days)</option>
              <option value="yearly">Yearly Plan (365 Days)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount</label>
            <input type="number" step="0.01" required value={formData.amount} onChange={(e: any) => setFormData({ ...formData, amount: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"/>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
            <select value={formData.currency} onChange={(e: any) => setFormData({ ...formData, currency: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600">
              <option value="BDT">BDT (৳ Taka)</option>
              <option value="USD">USD ($ Dollar)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Manual Method</label>
            <select value={formData.payment_method} onChange={(e: any) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600">
              <option value="manual_cash">Cash Payment</option>
              <option value="manual_bank_transfer">Bank Wire / Transfer</option>
              <option value="manual_bkash_agent">Direct bKash Agent/Merchant</option>
              <option value="manual_nagad_agent">Direct Nagad Agent/Merchant</option>
              <option value="manual_cheque">Bank Cheque / Draft</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Status</label>
            <select value={formData.status} onChange={(e: any) => setFormData({ ...formData, status: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600 font-medium">
              <option value="COMPLETED">Paid &amp; Activate Subscription</option>
              <option value="PENDING">Pending (Awaiting Deposit Verification)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction ID / Cheque Reference (Optional)
            </label>
            <input type="text" value={formData.transaction_id} onChange={(e: any) => setFormData({ ...formData, transaction_id: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"/>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Developer Notes &amp; Verification Details
            </label>
            <input type="text" value={formData.manual_payment_notes} onChange={(e: any) => setFormData({ ...formData, manual_payment_notes: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"/>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (<button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
              Cancel
            </button>)}
          <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 transition cursor-pointer shadow-sm">
            {loading ? 'Recording Payment...' : 'Record Payment & Activate Subscription'}
          </button>
        </div>
      </form>
    </div>);
}

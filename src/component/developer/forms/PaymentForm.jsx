'use client';

import { useState } from 'react';
import { BiCreditCard, BiCheck, BiX } from 'react-icons/bi';

export default function PaymentForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    creator_id: 101,
    package_id: 1,
    subscription_id: '',
    amount_in_cents: 2900,
    currency: 'USD',
    payment_method: 'STRIPE_CARD',
    transaction_id: '',
    status: 'COMPLETED',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const transaction_id = formData.transaction_id || 'txn_' + Date.now() + Math.random().toString(36).substring(2, 6);

    try {
      const res = await fetch('/api/developer/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          data: {
            ...formData,
            creator_id: Number(formData.creator_id),
            package_id: Number(formData.package_id),
            subscription_id: formData.subscription_id ? Number(formData.subscription_id) : null,
            amount_in_cents: Number(formData.amount_in_cents),
            transaction_id,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          creator_id: 101,
          package_id: 1,
          subscription_id: '',
          amount_in_cents: 2900,
          currency: 'USD',
          payment_method: 'STRIPE_CARD',
          transaction_id: '',
          status: 'COMPLETED',
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to record payment');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
            <BiCreditCard className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Record Platform Payment</h3>
            <p className="text-xs text-slate-500">Log an incoming payment transaction, refund, or manual credit adjustment.</p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <BiX className="text-xl" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Creator ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 101"
              value={formData.creator_id}
              onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Package ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 1"
              value={formData.package_id}
              onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Linked Subscription ID</label>
            <input
              type="number"
              placeholder="Optional"
              value={formData.subscription_id}
              onChange={(e) => setFormData({ ...formData, subscription_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Cents)</label>
            <input
              type="number"
              required
              placeholder="2900"
              value={formData.amount_in_cents}
              onChange={(e) => setFormData({ ...formData, amount_in_cents: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="STRIPE_CARD">Credit Card (Stripe)</option>
              <option value="PAYPAL">PayPal</option>
              <option value="BANK_TRANSFER">Bank Wire</option>
              <option value="CRYPTO">Crypto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Gateway ID</label>
          <input
            type="text"
            placeholder="e.g. txn_stripe_ch_3Nf4..."
            value={formData.transaction_id}
            onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            <BiCheck className="text-base" />
            <span>{loading ? 'Logging...' : 'Save Payment Record'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PaymentReceiptStudio = dynamic(
  () => import('src/component/developer/templates/PaymentReceiptStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <span>Loading Payment Receipt Fabric.js Canvas Engine...</span>
      </div>
    ),
  }
);

export default function PaymentReceiptBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTemplate() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/marketing/developer/templates/${id}?task=payment_receipt`);
        const data = await res.json();
        if (data.success && data.record) {
          setTemplate(data.record);
        } else {
          setError(data.error || 'Payment receipt template not found');
        }
      } catch (e) {
        setError(e.message || 'Error fetching template');
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [id]);

  const handleSave = async (updatedPayload) => {
    const res = await fetch(`/api/marketing/developer/templates/${id}?task=payment_receipt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to save payment receipt template');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Payment Receipt Studio</span>
        <p className="text-xs text-slate-500">Loading vector layout from system_payment_receipt_templates...</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3 p-6 text-center">
        <span className="text-[10px] uppercase font-semibold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
          Error Encountered
        </span>
        <h2 className="text-base font-semibold text-white">{error || 'Template not found'}</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          The requested payment receipt template could not be loaded from system_payment_receipt_templates.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/developer/templates/payment-receipt')}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Return to Payment Receipt Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <PaymentReceiptStudio
      initialTemplate={template}
      onSave={handleSave}
      onExitUrl="/developer/templates/payment-receipt"
    />
  );
}

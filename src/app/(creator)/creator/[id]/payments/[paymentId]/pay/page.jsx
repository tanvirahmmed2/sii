'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { BiLoaderAlt } from 'react-icons/bi';
import PaymentGatewayCheckout from '@/component/marketing/creator/PaymentGatewayCheckout';

function PayContent({ params }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params;
  const creatorId = resolvedParams?.id;
  const paymentId = resolvedParams?.paymentId;
  const searchParams = useSearchParams();
  const gatewayParam = searchParams.get('gateway');

  return (
    <PaymentGatewayCheckout
      creatorId={creatorId}
      paymentId={paymentId}
      initialGateway={gatewayParam || 'bkash'}
    />
  );
}

export default function CreatorPaymentPayPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
          <BiLoaderAlt className="animate-spin text-3xl text-secondary" />
          <p className="text-xs text-slate-500">Loading payment gateway...</p>
        </div>
      }
    >
      <PayContent params={params} />
    </Suspense>
  );
}

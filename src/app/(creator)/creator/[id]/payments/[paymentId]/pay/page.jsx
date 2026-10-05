'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentGatewayCheckout from 'src/component/marketing/creator/PaymentGatewayCheckout';

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
        <div className="py-8 text-center text-xs text-slate-500 font-medium">
          Loading payment gateway...
        </div>
      }
    >
      <PayContent params={params} />
    </Suspense>
  );
}

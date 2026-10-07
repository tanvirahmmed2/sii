'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentGatewayCheckout from 'src/component/marketing/creator/PaymentGatewayCheckout';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
      fallback={<LoadingScreen fullScreen={false} label="Loading payment gateway..." />}
    >
      <PayContent params={params} />
    </Suspense>
  );
}

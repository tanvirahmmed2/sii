import React from 'react';
import { redirect } from 'next/navigation';
import { isOfficer } from 'src/lib/middleware/officer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Officer Access Gateway | Campus Management',
  description: 'Administrative and operational officer workstation access gateway.',
};

export default async function OfficerAuthGatewayLayout({ children }) {
  const authenticated = await isOfficer();

  if (authenticated) {
    redirect('/officer');
  }

  return <>{children}</>;
}

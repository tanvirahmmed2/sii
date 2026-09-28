import React from 'react';
import { redirect } from 'next/navigation';
import { isCashier } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CashierFolderLayout = async ({ children }) => {
  const authorized = await isCashier();

  if (!authorized) {
    redirect('/staff');
  }

  return <>{children}</>;
};

export default CashierFolderLayout;

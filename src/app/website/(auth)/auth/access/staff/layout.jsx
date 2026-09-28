import React from 'react';
import { redirect } from 'next/navigation';
import { isStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const StaffAuthLayout = async ({ children }) => {
  const authenticated = await isStaff();
  
  if (authenticated) {
    redirect('/staff');
  }

  return (
    <>{children}</>
  );
};

export default StaffAuthLayout;

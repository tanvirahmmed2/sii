import React from 'react';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AdminAuthLayout = async ({ children }) => {
  const authenticated = await isAdmin();
  
  if (authenticated) {
    redirect('/admin');
  }

  return (
    <>{children}</>
  );
};

export default AdminAuthLayout;

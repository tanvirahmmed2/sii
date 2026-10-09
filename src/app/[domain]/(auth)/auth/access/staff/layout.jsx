import React from 'react';
import { redirect } from 'next/navigation';
import { isStaff } from 'src/lib/middleware/staff';

export const dynamic = 'force-dynamic';

const StaffAuthLayout = async ({ children }) => {
  const authenticated = await isStaff();
  
  if (authenticated) {
    redirect('/staff-panel');
  }

  return (
    <>{children}</>
  );
};

export default StaffAuthLayout;

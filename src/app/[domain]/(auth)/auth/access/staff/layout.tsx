import React from 'react';
import { redirect } from 'next/navigation';
import { isStaff } from 'src/lib/middleware/staff';
import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Staff Access Portal',
  description: `Administrative and faculty member authentication sign-in portal for ${SCHOOL_NAME}.`,
};

export const dynamic = 'force-dynamic';

const StaffAuthLayout = async ({ children }: any) => {
  const authenticated = await isStaff();
  if (authenticated) {
    redirect('/staff-panel');
  }
  return <>{children}</>;
};

export default StaffAuthLayout;

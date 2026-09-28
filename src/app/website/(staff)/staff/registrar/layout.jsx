import React from 'react';
import { redirect } from 'next/navigation';
import { isRegister } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RegistrarFolderLayout = async ({ children }) => {
  const authorized = await isRegister();

  if (!authorized) {
    redirect('/staff');
  }

  return <>{children}</>;
};

export default RegistrarFolderLayout;

import React from 'react';
import { redirect } from 'next/navigation';
import { isStudent } from 'src/lib/middleware/students';

export const dynamic = 'force-dynamic';

const StudentAuthLayout = async ({ children }) => {
  const authenticated = await isStudent();
  
  if (authenticated) {
    redirect('/student');
  }

  return (
    <>{children}</>
  );
};

export default StudentAuthLayout;

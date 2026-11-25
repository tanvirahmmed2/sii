import React from 'react';
import { redirect } from 'next/navigation';
import { isStudent } from 'src/lib/middleware/students';
import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Student Access Portal',
  description: `Student academic sign-in and credential verification portal for ${SCHOOL_NAME}.`,
};

export const dynamic = 'force-dynamic';

const StudentAuthLayout = async ({ children }: any) => {
  const authenticated = await isStudent();
  if (authenticated) {
    redirect('/student');
  }
  return <>{children}</>;
};

export default StudentAuthLayout;

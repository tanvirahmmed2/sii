import React from 'react';
import { redirect } from 'next/navigation';
import { isTeacher } from 'src/lib/middleware/teacher';
import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Teacher Access Portal',
  description: `Teacher and educator authentication sign-in portal for ${SCHOOL_NAME}.`,
};

export const dynamic = 'force-dynamic';

const TeacherAuthLayout = async ({ children }: any) => {
  const authenticated = await isTeacher();
  if (authenticated) {
    redirect('/teacher');
  }
  return <>{children}</>;
};

export default TeacherAuthLayout;

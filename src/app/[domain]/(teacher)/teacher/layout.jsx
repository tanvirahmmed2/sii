import React from 'react';
import { redirect } from 'next/navigation';
import { isTeacher } from 'src/lib/middleware/teacher';
import Navbar from 'src/component/website/bars/teacher/Navbar';
import Sidebar from 'src/component/website/bars/teacher/Sidebar';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher Dashboard | ${shortName} Campus`,
  description: `Teacher academic management portal for ${SCHOOL_NAME} (${shortName}).`,
};

export const dynamic = 'force-dynamic';

const TeacherLayout = async ({ children }) => {
  const authenticated = await isTeacher();

  if (!authenticated) {
    redirect('/auth/access/teacher/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1 relative pt-16">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 p-4 md:p-8 md:pl-[280px] transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;

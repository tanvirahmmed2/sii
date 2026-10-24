import Navbar from 'src/component/website/bars/student/Navbar'
import Sidebar from 'src/component/website/bars/student/Sidebar'
import React from 'react'
import { redirect } from 'next/navigation';
import { isStudent } from 'src/lib/middleware/students';

export const dynamic = 'force-dynamic';

const StudentLayout = async ({children}) => {
  const authenticated = await isStudent();

  if (!authenticated) {
    redirect('/auth/student/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1 pt-14 min-h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  )
}

export default StudentLayout

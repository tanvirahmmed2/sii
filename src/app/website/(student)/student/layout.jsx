import Navbar from '@/component/bars/student/Navbar'
import Sidebar from '@/component/bars/student/Sidebar'
import React from 'react'
import { redirect } from 'next/navigation';
import { isStudent } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const StudentLayout = async ({children}) => {
  const authenticated = await isStudent();

  if (!authenticated) {
    redirect('/auth/student/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
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
  )
}

export default StudentLayout
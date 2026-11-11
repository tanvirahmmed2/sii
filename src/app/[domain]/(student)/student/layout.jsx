import Navbar from 'src/component/website/bars/student/Navbar'
import Sidebar from 'src/component/website/bars/student/Sidebar'
import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation';
import { isStudent } from 'src/lib/middleware/students';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver';

export const dynamic = 'force-dynamic';

const StudentLayout = async ({ children, params }) => {
  const resolvedParams = params ? await params : null;
  const website = await resolveWebsiteFromRequest(null, { params: resolvedParams });

  if (website && website.is_available_student_panel === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v.01M12 9v4m-7 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Student Portal Not Available
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Access to the online student portal is not included in this institution&apos;s current subscription package ({website?.package?.name || 'Current Plan'}). Please contact campus administration to upgrade.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors"
            >
              Return to Campus Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const authenticated = await isStudent();

  if (!authenticated) {
    redirect('/auth/student/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <div className="flex flex-1 pt-14 min-h-[calc(100vh-3.5rem)]">
        <Sidebar />

        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  )
}

export default StudentLayout

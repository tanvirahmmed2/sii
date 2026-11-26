'use client';
import { useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import Navbar from 'src/component/marketing/developer/Navbar';
import Sidebar from 'src/component/marketing/developer/Sidebar';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { isDeveloperLinkAllowed } from 'src/lib/developer/navModules';
export const ROLE_PERMISSIONS: any = {};
export default function DeveloperLayout({ children }: any) {
    const { user, loading } = useContext<any>(Context);
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState<any>(false);
    useEffect(() => {
        if (!loading && !user) {
            router.push('/developer-auth/login');
        }
    }, [loading, user, router]);
    if (loading) {
        return <LoadingScreen fullScreen={true} label="Loading session..."/>;
    }
    if (!user) {
        return <LoadingScreen fullScreen={true} label="Redirecting to login..."/>;
    }
    const segments = pathname.split('/').filter(Boolean);
    const moduleName = (segments[1] || '').toLowerCase();
    const isAllowed = !segments[1] || isDeveloperLinkAllowed({ href: pathname }, user);
    if (!isAllowed) {
        return (<div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentUser={user}/>
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <Navbar onToggleSidebar={() => setSidebarOpen((prev: any) => !prev)} currentUser={user}/>
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-3">
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">Access Restricted</h2>
              <p className="text-xs font-normal text-slate-600 dark:text-slate-400">
                Your account ({user.roleName || user.role_name || user.role || 'Developer'}) does not have permission to access the module <span className="font-mono">/{moduleName}</span>.
              </p>
              <div className="pt-2">
                <Link href="/developer" className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors">
                  Return to Overview
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>);
    }
    const isBuilder = pathname.includes('/builder');
    if (isBuilder) {
        return <div className="h-screen w-screen overflow-hidden">{children}</div>;
    }
    return (<div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentUser={user}/>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Navbar onToggleSidebar={() => setSidebarOpen((prev: any) => !prev)} currentUser={user}/>
        <main className="flex-1 p-4 sm:p-5 w-full space-y-4">
          {children}
        </main>
      </div>
    </div>);
}

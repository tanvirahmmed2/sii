import { redirect } from 'next/navigation';
import { getAdminSession } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Developer Access | ${SITE_NAME}`,
  description: `Administrative authentication portal for ${SITE_NAME}.`,
};

export default async function DeveloperAuthLayout({ children }) {
  const session = await getAdminSession();

  if (session && session.isActive !== false) {
    redirect('/developer');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

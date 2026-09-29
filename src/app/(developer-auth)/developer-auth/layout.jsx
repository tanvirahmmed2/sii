import { redirect } from 'next/navigation';
import { getAdminSession } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Developer Portal | ${SITE_NAME}`,
  description: `Administrative authentication portal for ${SITE_NAME}.`,
};

export default async function DeveloperAuthLayout({ children }) {
  const session = await getAdminSession();

  if (session && session.isActive !== false) {
    redirect('/developer');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

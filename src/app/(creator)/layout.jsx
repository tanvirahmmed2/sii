import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Creator Studio | ${SITE_NAME}`,
  description: `Creator portal and website builder on ${SITE_NAME}.`,
};

export default function CreatorAccessRootLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {children}
    </div>
  );
}

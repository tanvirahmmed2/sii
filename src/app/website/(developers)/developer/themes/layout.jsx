import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Portfolio Themes | ${SITE_NAME}`,
  description: `Manage responsive portfolio templates, color schemes, and layouts on ${SITE_NAME}.`,
};

export default async function ThemesLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'themes');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

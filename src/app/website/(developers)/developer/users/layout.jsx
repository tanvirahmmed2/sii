import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `End-Users Directory | ${SITE_NAME}`,
  description: `Manage platform visitors, reviews, and end-user accounts on ${SITE_NAME}.`,
};

export default async function UsersLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'users');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

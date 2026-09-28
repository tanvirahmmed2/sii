import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Creators Directory | ${SITE_NAME}`,
  description: `Manage registered portfolio creators, subscriptions, and portfolio websites on ${SITE_NAME}.`,
};

export default async function CreatorsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'creators');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Newsletter Subscribers | ${SITE_NAME}`,
  description: `Manage newsletter subscribers and marketing audience lists on ${SITE_NAME}.`,
};

export default async function SubscribersLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'subscribers');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

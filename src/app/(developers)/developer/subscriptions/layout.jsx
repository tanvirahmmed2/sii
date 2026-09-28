import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Subscriptions Management | ${SITE_NAME}`,
  description: `Manage creator subscription plans, active recurring billing, and renewal status on ${SITE_NAME}.`,
};

export default async function SubscriptionsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'subscriptions');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

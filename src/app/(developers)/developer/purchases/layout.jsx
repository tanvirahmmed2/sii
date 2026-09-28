import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Creator Purchases | ${SITE_NAME}`,
  description: `Manage platform package purchases, orders, and subscriptions on ${SITE_NAME}.`,
};

export default async function PurchasesLayout({ children }) {
  const auth = await hasModulePermission(undefined, ['purchases', 'payments']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Support Tickets | ${SITE_NAME}`,
  description: `Help desk ticketing system and creator assistance on ${SITE_NAME}.`,
};

export default async function SupportLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'support');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Spam Defense & Security | ${SITE_NAME}`,
  description: `Supervise moderation rules, keyword defense, and abuse filters on ${SITE_NAME}.`,
};

export default async function SpamsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'spams');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

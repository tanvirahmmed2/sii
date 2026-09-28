import { redirect } from 'next/navigation';
import { isStaff } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Staff Profile | ${SITE_NAME}`,
  description: `Manage administrator profile, credentials, and access tokens on ${SITE_NAME}.`,
};

export default async function ProfileLayout({ children }) {
  const auth = await isStaff();
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

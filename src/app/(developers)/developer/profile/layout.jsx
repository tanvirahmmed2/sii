import { redirect } from 'next/navigation';
import { isStaff } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

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

import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Email Subscribers | ${SITE_NAME}`,
  description: `Send Redis-queued newsletters and announcements to website subscribers on ${SITE_NAME}.`,
};

export default async function EmailSubscribersLayout({ children }: any) {
  const auth = await hasModulePermission(undefined, ['email-subscribers', 'emails', 'subscribers', 'marketing']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }
  return <>{children}</>;
}

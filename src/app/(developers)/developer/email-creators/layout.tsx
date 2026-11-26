import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Email Creators | ${SITE_NAME}`,
  description: `Send Redis-queued platform emails and release announcements to creators on ${SITE_NAME}.`,
};

export default async function EmailCreatorsLayout({ children }: any) {
  const auth = await hasModulePermission(undefined, ['email-creators', 'emails', 'creators', 'marketing']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }
  return <>{children}</>;
}

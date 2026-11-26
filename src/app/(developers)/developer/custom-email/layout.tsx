import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Custom Email | ${SITE_NAME}`,
  description: `Compose and send custom emails with attachments using Brevo on ${SITE_NAME}.`,
};

export default async function CustomEmailLayout({ children }: any) {
  const auth = await hasModulePermission(undefined, ['custom-email', 'emails']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }
  return <>{children}</>;
}

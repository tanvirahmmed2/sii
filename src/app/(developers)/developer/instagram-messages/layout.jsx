import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Instagram Direct Inbox | Developer Portal | ${SITE_NAME}`,
  description: `Manage customer direct messages and inquiries received via Instagram Direct on ${SITE_NAME}.`,
};

export default async function DeveloperInstagramMessagesLayout({ children }) {
  const auth = await hasModulePermission(undefined, ['instagram-messages', 'instagram_messages', 'instagram', 'meta']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

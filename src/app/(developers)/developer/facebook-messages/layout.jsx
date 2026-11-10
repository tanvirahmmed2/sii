import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Facebook Messenger Inbox | Developer Portal | ${SITE_NAME}`,
  description: `Monitor and respond to customer conversations arriving via Facebook Messenger on ${SITE_NAME}.`,
};

export default async function DeveloperFacebookMessagesLayout({ children }) {
  const auth = await hasModulePermission(undefined, ['facebook-messages', 'facebook_messages', 'facebook', 'meta']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

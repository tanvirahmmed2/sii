import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Live Chats | ${SITE_NAME}`,
  description: `Real-time visitor chat sessions, support conversations, and help desk messages on ${SITE_NAME}.`,
};

export default async function LiveChatsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'live-chats');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

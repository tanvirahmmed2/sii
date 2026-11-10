import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `WhatsApp Cloud Inbox | Developer Portal | ${SITE_NAME}`,
  description: `Monitor and reply to incoming WhatsApp conversations and automated notifications on ${SITE_NAME}.`,
};

export default async function DeveloperWhatsAppMessagesLayout({ children }) {
  const auth = await hasModulePermission(undefined, ['whatsapp-messages', 'whatsapp_messages', 'whatsapp', 'meta']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}

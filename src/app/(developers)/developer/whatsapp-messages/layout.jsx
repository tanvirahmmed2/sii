import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `WhatsApp Cloud Inbox | Developer Portal | ${SITE_NAME}`,
  description: `Monitor and reply to incoming WhatsApp conversations and automated notifications on ${SITE_NAME}.`,
};

export default function DeveloperWhatsAppMessagesLayout({ children }) {
  return <>{children}</>;
}

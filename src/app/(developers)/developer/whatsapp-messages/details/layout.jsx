import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `WhatsApp Conversation Details | Developer Portal | ${SITE_NAME}`,
  description: `Detailed WhatsApp message exchange, media attachments, and delivery logs on ${SITE_NAME}.`,
};

export default function DeveloperWhatsAppDetailsLayout({ children }) {
  return <>{children}</>;
}

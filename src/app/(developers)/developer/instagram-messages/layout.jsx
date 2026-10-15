import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Instagram Direct Inbox | Developer Portal | ${SITE_NAME}`,
  description: `Manage customer direct messages and inquiries received via Instagram Direct on ${SITE_NAME}.`,
};

export default function DeveloperInstagramMessagesLayout({ children }) {
  return <>{children}</>;
}

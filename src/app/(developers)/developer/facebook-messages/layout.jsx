import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Facebook Messenger Inbox | Developer Portal | ${SITE_NAME}`,
  description: `Monitor and respond to customer conversations arriving via Facebook Messenger on ${SITE_NAME}.`,
};

export default function DeveloperFacebookMessagesLayout({ children }) {
  return <>{children}</>;
}

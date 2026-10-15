import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Facebook Conversation Details | Developer Portal | ${SITE_NAME}`,
  description: `Review complete Facebook message conversation history and customer interactions on ${SITE_NAME}.`,
};

export default function DeveloperFacebookDetailsLayout({ children }) {
  return <>{children}</>;
}

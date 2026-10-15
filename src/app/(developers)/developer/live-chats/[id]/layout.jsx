import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Live Chat Conversation | Developer Portal | ${SITE_NAME}`,
  description: `Active live chat conversation and customer support engagement on ${SITE_NAME}.`,
};

export default function DeveloperLiveChatSessionLayout({ children }) {
  return <>{children}</>;
}

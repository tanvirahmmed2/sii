import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Live Chat Session Transcript | Developer Portal | ${SITE_NAME}`,
  description: `Inspect visitor engagement analytics, IP location, and live chat session transcripts on ${SITE_NAME}.`,
};

export default function DeveloperLiveChatDetailsLayout({ children }) {
  return <>{children}</>;
}

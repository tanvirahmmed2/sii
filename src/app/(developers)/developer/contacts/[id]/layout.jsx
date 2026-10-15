import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Contact Inquiry Details | Developer Portal | ${SITE_NAME}`,
  description: `Review visitor inquiry details, sender information, and dispatch email replies on ${SITE_NAME}.`,
};

export default function DeveloperContactDetailsLayout({ children }) {
  return <>{children}</>;
}

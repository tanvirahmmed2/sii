import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Subscription Record Details | Developer Portal | ${SITE_NAME}`,
  description: `Detailed subscription lifecycle record, invoice history, and tenant billing state on ${SITE_NAME}.`,
};

export default function DeveloperSubscriptionDetailsLayout({ children }) {
  return <>{children}</>;
}

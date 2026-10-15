import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Subscription & Billing | ${SITE_NAME}`,
  description: `Manage active subscription plans, resource quotas, and billing settings on ${SITE_NAME}.`,
};

export default function CreatorSubscriptionLayout({ children }) {
  return <>{children}</>;
}

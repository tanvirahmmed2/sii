import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Package Plan Configuration | Developer Portal | ${SITE_NAME}`,
  description: `Configure subscription package quotas, pricing tiers, and allowed modules on ${SITE_NAME}.`,
};

export default function DeveloperPackageDetailsLayout({ children }) {
  return <>{children}</>;
}

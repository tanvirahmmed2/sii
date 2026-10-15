import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Tenant Website Management | Developer Portal | ${SITE_NAME}`,
  description: `Oversee institution tenant website domain, active package, and database configuration on ${SITE_NAME}.`,
};

export default function DeveloperWebsiteDetailsLayout({ children }) {
  return <>{children}</>;
}

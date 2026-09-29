import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `App Marketplace & Integrations | ${SITE_NAME}`,
  description: `Explore ecosystem apps, marketing integrations, and tools to empower your portfolio on ${SITE_NAME}.`,
};

export default function HomeAppsLayout({ children }) {
  return <>{children}</>;
}

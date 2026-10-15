import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Platform Overview & Telemetry | Developer Portal | ${SITE_NAME}`,
  description: `Executive dashboard with high-level system telemetry, active tenants, and user metrics on ${SITE_NAME}.`,
};

export default function DeveloperOverviewLayout({ children }) {
  return <>{children}</>;
}

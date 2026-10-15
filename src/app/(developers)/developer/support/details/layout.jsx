import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Support Incident Information | Developer Portal | ${SITE_NAME}`,
  description: `Comprehensive support incident breakdown, logs, and resolution audit trail on ${SITE_NAME}.`,
};

export default function DeveloperSupportDetailsLayout({ children }) {
  return <>{children}</>;
}

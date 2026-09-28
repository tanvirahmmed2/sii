import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Package Purchases | ${SITE_NAME}`,
  description: `Manage purchased templates, package upgrades, and billing cycles on ${SITE_NAME}.`,
};

export default function CreatorPurchasesLayout({ children }) {
  return <>{children}</>;
}

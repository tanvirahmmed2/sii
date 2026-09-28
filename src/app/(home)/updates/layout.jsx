import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Product Changelog & Updates | ${SITE_NAME}`,
  description: `Discover new feature releases, product updates, and platform improvements on ${SITE_NAME}.`,
};

export default function HomeUpdatesLayout({ children }) {
  return <>{children}</>;
}

import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Product Changelog & Updates | ${SITE_NAME}`,
  description: `Discover new feature releases, product updates, and platform improvements on ${SITE_NAME}.`,
};

export default function HomeUpdatesLayout({ children }) {
  return <>{children}</>;
}

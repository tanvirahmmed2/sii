import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Changelog & Platform Updates | ${SITE_NAME}`,
  description: `Latest features, bug fixes, and improvements for creators on ${SITE_NAME}.`,
};

export default function CreatorUpdatesLayout({ children }) {
  return <>{children}</>;
}

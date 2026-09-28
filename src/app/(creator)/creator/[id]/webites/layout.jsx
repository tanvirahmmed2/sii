import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Hosted Websites | ${SITE_NAME}`,
  description: `Manage your active portfolio websites, custom domains, and templates on ${SITE_NAME}.`,
};

export default function CreatorWebitesLayout({ children }) {
  return <>{children}</>;
}

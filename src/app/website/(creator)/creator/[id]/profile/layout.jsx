import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Creator Profile | ${SITE_NAME}`,
  description: `Manage your creator profile and personal portfolio details on ${SITE_NAME}.`,
};

export default function CreatorProfileLayout({ children }) {
  return <>{children}</>;
}

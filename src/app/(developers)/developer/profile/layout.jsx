import { redirect } from 'next/navigation';
import { isDeveloper } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Developer Profile | ${SITE_NAME}`,
  description: `Manage developer profile, credentials, and access tokens on ${SITE_NAME}.`,
};

export default async function ProfileLayout({ children }) {
  const isDev = await isDeveloper();
  if (!isDev) {
    redirect('/developer');
  }

  return <>{children}</>;
}

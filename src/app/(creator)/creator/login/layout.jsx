import { redirect } from 'next/navigation';
import { getCreatorSession } from '@/lib/middleware/creator';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Creator Login | ${SITE_NAME}`,
  description: `Access your creator dashboard on ${SITE_NAME}.`,
};

export default async function CreatorLoginLayout({ children }) {
  const session = await getCreatorSession();
  if (session && session.isActive && session.isVerified) {
    redirect(`/creator/${session.id}`);
  }
  return <>{children}</>;
}

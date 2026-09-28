import { redirect } from 'next/navigation';
import { getCreatorSession } from '@/lib/middleware/creator';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Reset Password | ${SITE_NAME}`,
  description: `Recover your creator account access on ${SITE_NAME}.`,
};

export default async function CreatorRecoveryLayout({ children }) {
  const session = await getCreatorSession();
  if (session && session.isActive && session.isVerified) {
    redirect(`/creator/${session.id}`);
  }
  return <>{children}</>;
}

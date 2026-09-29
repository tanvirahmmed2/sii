import { redirect } from 'next/navigation';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { SITE_NAME } from 'src/lib/database/secret';

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

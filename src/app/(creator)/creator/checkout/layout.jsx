import { redirect } from 'next/navigation';
import { getCreatorSession } from '@/lib/middleware/creator';

export default async function CreatorCheckoutLayout({ children }) {
  const session = await getCreatorSession();
  if (!session || session.isActive === false || session.isVerified === false) {
    redirect('/creator/login');
  }
  return <>{children}</>;
}

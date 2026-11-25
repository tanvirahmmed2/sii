import { redirect } from 'next/navigation';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Checkout & Plan Activation | ${SITE_NAME}`,
  description: `Review subscription packages, apply promotional discounts, and complete payment on ${SITE_NAME}.`,
};

export default async function CreatorCheckoutLayout({ children }: any) {
  const session = await getCreatorSession();
  if (!session || session.isActive === false || session.isVerified === false) {
    redirect('/creator/login');
  }
  return <>{children}</>;
}

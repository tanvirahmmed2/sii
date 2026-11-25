import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Withdrawal Requests & Payouts | Developer Portal | ${SITE_NAME}`,
  description: `Review withdrawal applications, verify bank accounts, and process payout batches on ${SITE_NAME}.`,
};

export default function DeveloperWithdrawsLayout({ children }: any) {
  return <>{children}</>;
}
